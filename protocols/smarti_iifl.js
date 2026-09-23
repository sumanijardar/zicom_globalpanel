const net = require("net");
const pool = require("../config/database");
const { panelConfigCache } = require("../config/routing");
const decodeSIAIIFL = require("../decoders/smarti_iifl_decoder");

const TCP_PORT = 5501;

const activeSockets = new Map();   // account -> socket
const eventLog = [];
const MAX_LOG = 100;
const commandQueue = new Map();    // account -> [{ command, zone, resolve, queuedAt }]
const connectWaiters = new Map();  // account -> [resolve]
let outSequence = 1;

// =================================================
// SIA DC-09 Protocol Helpers
// =================================================
function calculateCRC16(str) {
  let crc = 0x0000;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x0001) crc = (crc >> 1) ^ 0xA001;
      else crc >>= 1;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function calculateLength(str) {
  return str.length.toString(16).toUpperCase().padStart(4, '0');
}

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())},${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}`;
}

function parseSIAHeader(message) {
  const match = message.match(/^([0-9A-Fa-f]{4})([0-9A-Fa-f]{4})"(.*?)"(\d{4})(R\w+)(L\w+)#(\w+)/);
  if (match) {
    return {
      crc: match[1],
      length: match[2],
      protocol: match[3],
      sequence: match[4],
      receiver: match[5],
      line: match[6],
      account: match[7]
    };
  }
  return null;
}

function buildACK(header) {
  const ts = getTimestamp();
  const body = `"ACK"${header.sequence}${header.receiver}${header.line}#${header.account}[]_${ts}`;
  const crc = calculateCRC16(body);
  const len = calculateLength(body);
  return `\n${crc}${len}${body}\r`;
}

// Commands mapping based on Smart-i IIFL 32 Zone protocol
// Commands mapping based on Smart-i IIFL 32 Zone protocol
const COMMAND_MAP = {
  'ARM': 'NCG',             // System Arm (NCG + group/zone, default 001)
  'DISARM': 'NOG',          // System Disarm (NOG + group/zone, default 001)
  'STAY': 'NCP001',         // System Partial Arm

  // Siren / Hooter / Relay Control (NZH = ON, NZL = OFF)
  'SIREN_ON': 'NZH',        // Output ON prefix (NZH + zone, e.g. NZH001 or NZH003)
  'SIREN_OFF': 'NZL',       // Output OFF prefix (NZL + zone, e.g. NZL001 or NZL003)
  'HOOTER_ON': 'NZH',       // Hooter ON prefix (NZH + zone)
  'HOOTER_OFF': 'NZL',      // Hooter OFF prefix (NZL + zone, e.g. NZL001)
  'HOOTER': 'NZH',          // Default Hooter ON
  'SIREN': 'NZH',           // Default Siren ON

  // Output / Relay Direct Commands
  'RELAY_ON': 'NZH',        // Output ON prefix (NZH + zone)
  'RELAY_OFF': 'NZL',       // Output OFF prefix (NZL + zone)

  // AC / Light Control
  'AC1_ON': 'NZH005',
  'AC1_OFF': 'NZL005',
  'AC2_ON': 'NZH006',
  'AC2_OFF': 'NZL006',
  'LIGHT_ON': 'NZH008',
  'LIGHT_OFF': 'NZL008',

  // Reset and Status Commands
  'RESET': 'NYY000',
  'STATUS': 'NYY040'
};

function buildSIACommand(commandType, account, zone = "000", receiver = "R000001", line = "L000000") {
  const upperCmd = commandType.toUpperCase();
  const cmdBase = COMMAND_MAP[upperCmd];
  if (!cmdBase) return null;

  const seq = String(outSequence++).padStart(4, '0');
  if (outSequence > 9999) outSequence = 1;
  const ts = getTimestamp();

  // Smart-i panels expect a 6-digit account number (e.g., #080600)
  const paddedAccount = String(account).padStart(6, '0');

  // Format zone to 3 digits (default to 001 if 000 is given for zone-based output commands)
  const zoneStr = String(zone || "000").trim();
  const targetZone = (zoneStr !== "000" && zoneStr !== "") ? zoneStr.padStart(3, '0') : "001";

  let innerCode;
  if (cmdBase.length === 6) {
    // Already full 6-character code (e.g., NCP001, NZH005, NYY040)
    innerCode = cmdBase;
  } else if (cmdBase.startsWith('[')) {
    // Extended bracket payload format if ever used
    const dataWithoutTs = `"SIA-DCS"${seq}${receiver}${line}#${paddedAccount}[#${paddedAccount}|NYY005]${cmdBase}`;
    const dataWithTs = dataWithoutTs + '_' + ts;
    const crc = calculateCRC16(dataWithTs);
    const len = calculateLength(dataWithTs);
    return `\n${crc}${len}${dataWithTs}\r`;
  } else {
    // Dynamic command code + 3-digit zone (e.g. NZH + 003 = NZH003, NZL + 003 = NZL003, NCG + 001 = NCG001)
    innerCode = `${cmdBase}${targetZone}`;
  }

  const dataWithoutTs = `"SIA-DCS"${seq}${receiver}${line}#${paddedAccount}[#${paddedAccount}|${innerCode}]`;
  const dataWithTs = dataWithoutTs + '_' + ts;
  const crc = calculateCRC16(dataWithTs);
  const len = calculateLength(dataWithTs);
  const result = `\n${crc}${len}${dataWithTs}\r`;

  console.log(`\n🛠️  [CONSTRUCTED SMARTI-IIFL SIA COMMAND] Type: ${commandType}, Zone: ${targetZone}, InnerCode: ${innerCode}, Account: ${paddedAccount}`);
  return result;
}

function sendCommandToPanel(socket, commandType, accountNo, zone = "000") {
  if (socket.destroyed) {
    console.log("❌ SMARTI-IIFL Connection lost, cannot send command.");
    return false;
  }
  const cmd = buildSIACommand(commandType, accountNo, zone);
  if (!cmd) {
    console.log(`⚠️ SMARTI-IIFL Unknown Command: ${commandType}`);
    return false;
  }
  socket.write(cmd);
  console.log(`\n📤 [SMARTI-IIFL] Command Sent [${commandType}]:`);
  console.log(`   Raw Format: ${cmd.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}`);
  return true;
}

// ==========================================
// 1. TCP SERVER
// ==========================================
function handleSocketEvents(socket, remoteIp, initialAccount = null) {
  let currentAccount = initialAccount;
  socket.setKeepAlive(true, 30000);
  socket.setTimeout(180000);

  socket.on("timeout", () => socket.destroy());
  socket.on("data", async (data) => {
    const message = data.toString().trim();
    if (!message) return;

    console.log(`\n📩 [SMARTI-IIFL] Raw Data Received: ${message}`);

    const header = parseSIAHeader(message);
    const decoded = decodeSIAIIFL(message);

    console.log(`🔓 [SMARTI-IIFL] Decoded Meaning:`);
    console.log(JSON.stringify(decoded, null, 2));

    if (header && !decoded.account) {
      decoded.account = header.account;
    }

    let crcOK = false, lenOK = false;
    if (header) {
      const dataBody = message.substring(8);
      const calculatedCRC = calculateCRC16(dataBody);
      const calculatedLen = calculateLength(dataBody);
      crcOK = header.crc.toUpperCase() === calculatedCRC.toUpperCase();
      lenOK = header.length.toUpperCase() === calculatedLen.toUpperCase();
    }

    if (decoded.account) {
      currentAccount = decoded.account;
      activeSockets.set(currentAccount, socket);

      const waiters = connectWaiters.get(currentAccount);
      if (waiters && waiters.length > 0) {
        for (const resolve of waiters) resolve({ account: currentAccount });
        connectWaiters.set(currentAccount, []);
      }

      if (decoded.code) {
        const seqno = header ? header.sequence : '0000';
        const alarmCode = decoded.code;
        const receivedtime = new Date().toISOString().slice(0, 19).replace('T', ' ');

        let priority = 'N', level = 0, targetTable = 'alerts';
        const configsArray = panelConfigCache.get('SMARTI_IIFL') || panelConfigCache.get('SMARTI');

        if (configsArray) {
          let matchedConfig = null;
          for (const config of configsArray) {
            if (config.alarmCodeArr.includes(alarmCode)) {
              matchedConfig = config;
              break;
            }
          }

          if (matchedConfig) {
            if (matchedConfig.destination === 'back') {
              targetTable = 'backalerts';
            } else if (matchedConfig.destination === 'front') {
              targetTable = 'alerts';
              if (matchedConfig.level1Arr.includes(alarmCode)) { level = 1; priority = 'Y'; }
              else if (matchedConfig.level2Arr.includes(alarmCode)) { level = 2; priority = 'Y'; }
              else if (matchedConfig.level3Arr.includes(alarmCode)) { level = 3; priority = 'Y'; }
              else { level = 0; priority = matchedConfig.rowPriority; }
            }
          }
        }

        const baseValues = [
          currentAccount, seqno, decoded.zone || '000', alarmCode,
          decoded.formattedDate || receivedtime, decoded.event || ''
        ];

        try {
          await pool.query(`INSERT INTO alerts_copy (panelid, seqno, zone, alarm, createtime, alerttype, status) VALUES (?, ?, ?, ?, ?, ?,'O')`, baseValues);
        } catch (err) { }

        try {
          await pool.query(`INSERT INTO ${targetTable} (panelid, seqno, zone, alarm, createtime, alerttype, status, priority, level) VALUES (?, ?, ?, ?, ?, ?, 'O', ?, ?)`, [...baseValues, priority, level]);
          console.log(`✅ [SMARTI-IIFL] Data successfully saved to ${targetTable} (Alarm: ${alarmCode} Zone: ${decoded.zone})`);
        } catch (err) {
          console.error(`❌ DB Error (${targetTable}):`, err.message);
        }
      }
    }

    eventLog.unshift({
      ...decoded,
      raw: message,
      crcValid: crcOK,
      receivedAt: new Date().toISOString()
    });
    if (eventLog.length > MAX_LOG) eventLog.pop();

    if (header && !socket.destroyed) {
      let commandSentFromQueue = false;
      if (currentAccount) {
        const queue = commandQueue.get(currentAccount);
        if (queue && queue.length > 0) {
          const pending = [...queue];
          commandQueue.set(currentAccount, []);
          for (const item of pending) {
            const cmd = buildSIACommand(item.command, currentAccount, item.zone || '000');
            if (cmd) {
              socket.write(cmd);
              commandSentFromQueue = true;
              if (item.resolve) item.resolve({ sent: true, command: item.command, zone: item.zone || '000', sentAt: new Date().toISOString() });
            } else {
              if (item.resolve) item.resolve({ sent: false, command: item.command });
            }
          }
        }
      }
      if (!commandSentFromQueue && !message.includes('"ACK"')) {
        const ackMsg = buildACK(header);
        socket.write(ackMsg);
        console.log(`📤 [SMARTI-IIFL] ACK Sent: ${ackMsg.trim()}`);
      }
    }
  });

  socket.on("end", () => { if (currentAccount) activeSockets.delete(currentAccount); });
  socket.on("error", () => { });
  socket.on("close", () => { if (currentAccount) activeSockets.delete(currentAccount); });
}

function initiatePanelConnection(panelId, ip) {
  const OUTGOING_PORT = 5000;
  console.log(`\n⏳ [SMARTI-IIFL] Attempting OUTGOING connection to Panel #${panelId} at IP: ${ip}:${OUTGOING_PORT}...`);
  const socket = new net.Socket();

  socket.connect(OUTGOING_PORT, ip, () => {
    console.log(`✅ [SMARTI-IIFL] Successfully connected to Panel #${panelId} (${ip})`);
    activeSockets.set(panelId, socket);
    handleSocketEvents(socket, ip, panelId);

    setTimeout(() => {
      if (socket.destroyed) return;
      const queue = commandQueue.get(panelId);
      if (queue && queue.length > 0) {
        const pending = [...queue];
        commandQueue.set(panelId, []);
        for (const item of pending) {
          const success = sendCommandToPanel(socket, item.command, panelId, item.zone || '000');
          if (item.resolve) {
            item.resolve({ sent: success, command: item.command, zone: item.zone || '000', sentAt: new Date().toISOString() });
          }
        }
      }
    }, 1500);
  });

  socket.on("error", (err) => {
    console.log(`❌ [SMARTI-IIFL] Connection failed to Panel #${panelId} (${ip}): ${err.message}`);
  });

  socket.on("close", () => {
    console.log(`⚠️ [SMARTI-IIFL] Connection closed for Panel #${panelId} (${ip}). Retrying in 3 minutes...`);
    setTimeout(() => {
      if (!activeSockets.has(panelId) || activeSockets.get(panelId).destroyed) {
        initiatePanelConnection(panelId, ip);
      }
    }, 180000);
  });
}

async function connectToAllPanels() {
  try {
    const [rows] = await pool.query("SELECT NewPanelID, dvrip FROM sites WHERE Panel_Make = 'smarti-iifl' AND dvrip IS NOT NULL AND dvrip != ''; ");
    if (rows && rows.length > 0) {
      console.log(`\n🔄 [SMARTI-IIFL] Found ${rows.length} Smart-i IIFL panels with IPs in database. Initiating outgoing connections...`);
      for (const row of rows) {
        const panelId = String(row.NewPanelID).trim();
        const ip = String(row.dvrip).trim();
        if (!activeSockets.has(panelId)) initiatePanelConnection(panelId, ip);
      }
    } else {
      console.log(`\nℹ️ [SMARTI-IIFL] No Smart-i IIFL panels found in database with valid IP for outgoing connection.`);
    }
  } catch (err) {
    console.error(`❌ [SMARTI-IIFL] Error fetching panels from DB for outgoing connections:`, err.message);
  }
}

function startServer() {
  // connectToAllPanels();
  // setInterval(connectToAllPanels, 180000);

  const tcpServer = net.createServer((socket) => {
    const remoteIp = socket.remoteAddress ? socket.remoteAddress.replace(/^.*:/, '').trim() : null;
    console.log(`\n📡 [SMARTI-IIFL] Device TCP Connection Initiated from IP: ${remoteIp}`);
    handleSocketEvents(socket, remoteIp);
  });

  tcpServer.listen(TCP_PORT, () => {
    console.log(`🚀 SMARTI-IIFL TCP Server listening for devices on port ${TCP_PORT}`);
  });
}

// ==========================================
// 2. API Handlers
// ==========================================
function checkConnection(account, maxWait = 60000) {
  return new Promise((resolve) => {
    const sock = activeSockets.get(account);
    if (sock && !sock.destroyed) {
      return resolve({ success: true, status: "online" });
    }
    if (!connectWaiters.has(account)) connectWaiters.set(account, []);
    let done = false;
    connectWaiters.get(account).push(() => {
      if (!done) { done = true; resolve({ success: true, status: "online" }); }
    });
    setTimeout(() => {
      if (!done) { done = true; resolve({ success: false, status: "timeout" }); }
    }, maxWait);
  });
}

function queueCommand(account, command, zone, maxWait = 60000) {
  return new Promise((resolve) => {
    const sock = activeSockets.get(account);
    const timeBefore = new Date().toISOString();
    if (sock && !sock.destroyed) {
      const success = sendCommandToPanel(sock, command, account, zone);
      setTimeout(() => {
        const newEvents = eventLog.filter(e => e.account === account && e.receivedAt > timeBefore);
        resolve({ success, status: "sent_immediately", panelResponse: newEvents, responseCount: newEvents.length });
      }, 3000);
    } else {
      if (!commandQueue.has(account)) commandQueue.set(account, []);
      let done = false;
      commandQueue.get(account).push({
        command, zone, queuedAt: timeBefore,
        resolve: (res) => {
          if (!done) {
            done = true;
            setTimeout(() => {
              const newEvents = eventLog.filter(e => e.account === account && e.receivedAt > (res.sentAt || timeBefore));
              resolve({ success: res.sent, status: "sent_from_queue", panelResponse: newEvents, responseCount: newEvents.length });
            }, 3000);
          }
        }
      });

      pool.query("SELECT dvrip FROM sites WHERE NewPanelID = ? AND dvrip IS NOT NULL AND dvrip != '' LIMIT 1", [account])
        .then(([rows]) => {
          if (rows && rows.length > 0) {
            const ip = String(rows[0].dvrip).trim();
            console.log(`\n🔄 [SMARTI-IIFL] On-Demand connection triggered for Panel #${account} (IP: ${ip})`);
            initiatePanelConnection(account, ip);
          } else {
            console.log(`\n⚠️ [SMARTI-IIFL] Cannot connect on-demand to Panel #${account}: No valid IP found in DB.`);
          }
        })
        .catch(err => console.error(`\n❌ [SMARTI-IIFL] DB Error while fetching IP for on-demand connection:`, err.message));

      setTimeout(() => {
        if (!done) {
          done = true;
          resolve({ success: false, status: "timeout", message: "Panel did not connect" });
        }
      }, maxWait);
    }
  });
}

function getEvents(account, limit) {
  let events = account ? eventLog.filter(e => e.account === account) : eventLog;
  if (limit > 0) events = events.slice(0, limit);
  return { success: true, count: events.length, events };
}

function getStatus() {
  const devices = [];
  activeSockets.forEach((sock, acct) => { devices.push({ account: acct, connected: !sock.destroyed }); });
  return { success: true, devices };
}

module.exports = {
  startServer,
  checkConnection,
  queueCommand,
  getEvents,
  getStatus,
  buildSIACommand
};
