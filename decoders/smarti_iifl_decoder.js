/**
 * Smart-i IIFL 32 Zone Protocol Decoder
 * Mapped 100% according to smarti_iifl32 (2).csv and IIFL 32 Zone BOQ Sheet.
 */

// Direct Event Code to Event Description mapping from smarti_iifl32 (2).csv
const EVENT_CODE_MAP = {
    // Zone 001 - AC Mains (DI)
    "NBA001": { name: "AC Mains (DI)", zone: "001", code: "BA", alertType: "Y" },
    "NBR001": { name: "AC Mains (DI) Restoral", zone: "001", code: "BR", alertType: "Y" },

    // Zone 002 - UPS O/P (DI)
    "NBA002": { name: "UPS O/P (DI)", zone: "002", code: "BA", alertType: "Y" },
    "NBR002": { name: "UPS O/P (DI) Restoral", zone: "002", code: "BR", alertType: "Y" },

    // Zone 003 - Vault Room Door
    "NBA003": { name: "Vault Room Door", zone: "003", code: "BA", alertType: "B" },
    "NBR003": { name: "Vault Room Door Restoral", zone: "003", code: "BR", alertType: "B" },

    // Zone 004 - Main Door
    "NBA004": { name: "Main Door", zone: "004", code: "BA", alertType: "B" },
    "NBR004": { name: "Main Door Restoral", zone: "004", code: "BR", alertType: "B" },

    // Zone 005 - BM Cashier Door
    "NBA005": { name: "BM Cashier Door", zone: "005", code: "BA", alertType: "B" },
    "NBR005": { name: "BM Cashier Door Restoral", zone: "005", code: "BR", alertType: "B" },

    // Zone 006 - Lobby PIR
    "NBA006": { name: "Lobby PIR", zone: "006", code: "BA", alertType: "B" },
    "NBR006": { name: "Lobby PIR Restoral", zone: "006", code: "BR", alertType: "B" },

    // Zone 007 - Cashier PIR
    "NBA007": { name: "Cashier PIR", zone: "007", code: "BA", alertType: "B" },
    "NBR007": { name: "Cashier PIR Restoral", zone: "007", code: "BR", alertType: "B" },

    // Zone 008 - Vault PIR
    "NBA008": { name: "Vault PIR", zone: "008", code: "BA", alertType: "B" },
    "NBR008": { name: "Vault PIR Restoral", zone: "008", code: "BR", alertType: "B" },

    // Arm / Disarm / Hooter Events
    "NCG001": { name: "System arm", zone: "001", code: "CG", alertType: "R" },
    "NOG001": { name: "System disarm", zone: "001", code: "OG", alertType: "R" },
    "NAG001": { name: "Auto arm", zone: "001", code: "AG", alertType: "R" },
    "NHA001": { name: "Hooter on locally", zone: "001", code: "HA", alertType: "R" },
    "NZL001": { name: "Hooter off ZCC", zone: "001", code: "ZL", alertType: "B" },
    "NDO003": { name: "Door open too long", zone: "003", code: "DO", alertType: "R" },

    // Zone 009 - BM Foot Panic
    "NBA009": { name: "BM Foot Panic", zone: "009", code: "BA", alertType: "R" },
    "NBR009": { name: "BM Foot Panic Restoral", zone: "009", code: "BR", alertType: "R" },

    // Zone 010 - Valuer Desk Foot Panic
    "NBA010": { name: "Valuer Desk Foot Panic", zone: "010", code: "BA", alertType: "R" },
    "NBR010": { name: "Valuer Desk Foot Panic Restoral", zone: "010", code: "BR", alertType: "R" },

    // Zone 011 - Silence Key
    "NBA011": { name: "Silence Key", zone: "011", code: "BA", alertType: "B" },
    "NBR011": { name: "Silence Key Restoral", zone: "011", code: "BR", alertType: "B" },

    // Zone 012 - Hooter sense
    "NBA012": { name: "Hooter sense", zone: "012", code: "BA", alertType: "R" },
    "NBR012": { name: "Hooter sense Restoral", zone: "012", code: "BR", alertType: "R" },

    // Zone 013 - Inbuilt (Inverted Zone)
    "NBA013": { name: "Inbuilt (Inverted Zone)", zone: "013", code: "BA", alertType: "B" },
    "NBR013": { name: "Inbuilt (Inverted Zone) Restoral", zone: "013", code: "BR", alertType: "B" },

    // Zone 014 - Panel Tamper
    "NBA014": { name: "Panel Tamper", zone: "014", code: "BA", alertType: "R" },
    "NBR014": { name: "Panel Tamper Restoral", zone: "014", code: "BR", alertType: "R" },

    // Zone 015 - ATM Backroom
    "NBA015": { name: "ATM Backroom", zone: "015", code: "BA", alertType: "B" },
    "NBR015": { name: "ATM Backroom Restoral", zone: "015", code: "BR", alertType: "B" },

    // Zone 016 - Smoke Detector IP
    "NBA016": { name: "Smoke Detector IP", zone: "016", code: "BA", alertType: "R" },
    "NBR016": { name: "Smoke Detector IP Restoral", zone: "016", code: "BR", alertType: "R" },

    // Zone 017 - Manager Cabin Panic
    "NBA017": { name: "Manager Cabin Panic", zone: "017", code: "BA", alertType: "R" },
    "NBR017": { name: "Manager Cabin Panic Restoral", zone: "017", code: "BR", alertType: "R" },

    // Zone 018 - Vault Room Panic Switch
    "NBA018": { name: "Vault Room Panic Switch", zone: "018", code: "BA", alertType: "R" },
    "NBR018": { name: "Vault Room Panic Switch Restoral", zone: "018", code: "BR", alertType: "R" },

    // Zone 019 - Valuer Panic
    "NBA019": { name: "Valuer Panic", zone: "019", code: "BA", alertType: "R" },
    "NBR019": { name: "Valuer Panic Restoral", zone: "019", code: "BR", alertType: "R" },

    // Zone 020 - Washroom Panic Switch
    "NBA020": { name: "Washroom Panic Switch", zone: "020", code: "BA", alertType: "R" },
    "NBR020": { name: "Washroom Panic Switch Restoral", zone: "020", code: "BR", alertType: "R" },

    // Zone 021 - CCE Panic
    "NBA021": { name: "CCE Panic", zone: "021", code: "BA", alertType: "R" },
    "NBR021": { name: "CCE Panic Restoral", zone: "021", code: "BR", alertType: "R" },

    // Zone 022 - Cordless Security Person Panic
    "NBA022": { name: "Cordless Security Person Panic", zone: "022", code: "BA", alertType: "R" },
    "NBR022": { name: "Cordless Security Person Panic Restoral", zone: "022", code: "BR", alertType: "R" },

    // Zone 023 - Panel Magnetic Vibration
    "NBA023": { name: "Panel Magnetic Vibration", zone: "023", code: "BA", alertType: "R" },
    "NBR023": { name: "Panel Magnetic Vibration Restoral", zone: "023", code: "BR", alertType: "R" },

    // Zone 024 - Vault Vibration on Wall
    "NBA024": { name: "Vault Vibration on Wall", zone: "024", code: "BA", alertType: "R" },
    "NBR024": { name: "Vault Vibration on Wall Restoral", zone: "024", code: "BR", alertType: "R" },

    // Zone 025 - Shutter Door Open
    "NBA025": { name: "Shutter Door Open", zone: "025", code: "BA", alertType: "R" },
    "NBR025": { name: "Shutter Door Open Restoral", zone: "025", code: "BR", alertType: "R" },

    // Zone 026 - DIS Door Emergency
    "NBA026": { name: "DIS Door Emergency", zone: "026", code: "BA", alertType: "R" },
    "NBR026": { name: "DIS Door Emergency Restoral", zone: "026", code: "BR", alertType: "R" },

    // Zone 027 - Cashier door/Vault vibration2
    "NBA027": { name: "Cashier door/Vault vibration2", zone: "027", code: "BA", alertType: "R" },
    "NBR027": { name: "Cashier door/Vault vibration2 Restoral", zone: "027", code: "BR", alertType: "R" },

    // Zone 028 - Vault wall vibration DIS PANEL
    "NBA028": { name: "Vault wall vibration DIS PANEL", zone: "028", code: "BA", alertType: "R" },
    "NBR028": { name: "Vault wall vibration DIS PANEL Restoral", zone: "028", code: "BR", alertType: "R" },

    // Zone 029 - DIS Panel vibration shutter 2
    "NBA029": { name: "DIS Panel vibration shutter 2", zone: "029", code: "BA", alertType: "R" },
    "NBR029": { name: "DIS Panel vibration shutter 2 Restoral", zone: "029", code: "BR", alertType: "R" },

    // Zone 030 - BM cabin door
    "NBA030": { name: "BM cabin door", zone: "030", code: "BA", alertType: "R" },
    "NBR030": { name: "BM cabin door Restoral", zone: "030", code: "BR", alertType: "R" },

    // Zone 031 - Spare
    "NBA031": { name: "Spare Zone 31", zone: "031", code: "BA", alertType: "B" },
    "NBR031": { name: "Spare Zone 31 Restoral", zone: "031", code: "BR", alertType: "B" },

    // Zone 032 - Spare
    "NBA032": { name: "Spare Zone 32", zone: "032", code: "BA", alertType: "B" },
    "NBR032": { name: "Spare Zone 32 Restoral", zone: "032", code: "BR", alertType: "B" }
};

// Zone Number to Details Mapping (from smarti_iifl32 (2).csv)
const ZONE_MAP = {
    "001": { name: "AC Mains (DI)", alarmCode: "BA", restoreCode: "BR", alertType: "Y" },
    "002": { name: "UPS O/P (DI)", alarmCode: "BA", restoreCode: "BR", alertType: "Y" },
    "003": { name: "Vault Room Door", alarmCode: "BA", restoreCode: "BR", alertType: "B" },
    "004": { name: "Main Door", alarmCode: "BA", restoreCode: "BR", alertType: "B" },
    "005": { name: "BM Cashier Door", alarmCode: "BA", restoreCode: "BR", alertType: "B" },
    "006": { name: "Lobby PIR", alarmCode: "BA", restoreCode: "BR", alertType: "B" },
    "007": { name: "Cashier PIR", alarmCode: "BA", restoreCode: "BR", alertType: "B" },
    "008": { name: "Vault PIR", alarmCode: "BA", restoreCode: "BR", alertType: "B" },
    "009": { name: "BM Foot Panic", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "010": { name: "Valuer Desk Foot Panic", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "011": { name: "Silence Key", alarmCode: "BA", restoreCode: "BR", alertType: "B" },
    "012": { name: "Hooter sense", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "013": { name: "Inbuilt (Inverted Zone)", alarmCode: "BA", restoreCode: "BR", alertType: "B" },
    "014": { name: "Panel Tamper", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "015": { name: "ATM Backroom", alarmCode: "BA", restoreCode: "BR", alertType: "B" },
    "016": { name: "Smoke Detector IP", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "017": { name: "Manager Cabin Panic", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "018": { name: "Vault Room Panic Switch", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "019": { name: "Valuer Panic", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "020": { name: "Washroom Panic Switch", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "021": { name: "CCE Panic", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "022": { name: "Cordless Security Person Panic", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "023": { name: "Panel Magnetic Vibration", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "024": { name: "Vault Vibration on Wall", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "025": { name: "Shutter Door Open", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "026": { name: "DIS Door Emergency", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "027": { name: "Cashier door/Vault vibration2", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "028": { name: "Vault wall vibration DIS PANEL", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "029": { name: "DIS Panel vibration shutter 2", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "030": { name: "BM cabin door", alarmCode: "BA", restoreCode: "BR", alertType: "R" },
    "031": { name: "Spare Zone 31", alarmCode: "BA", restoreCode: "BR", alertType: "B" },
    "032": { name: "Spare Zone 32", alarmCode: "BA", restoreCode: "BR", alertType: "B" }
};

const GENERIC_EVENTS = {
    "BA": "Burglary Alarm",
    "BR": "Burglary Restoral",
    "FA": "Fire Alarm",
    "FR": "Fire Restoral",
    "TA": "Tamper Alarm",
    "TR": "Tamper Restoral",
    "PA": "Panic Alarm",
    "PR": "Panic Restoral",
    "AT": "AC Power Fail",
    "AR": "AC Power Restored",
    "YT": "Low Battery",
    "YR": "Battery Restored",
    "CG": "System arm",
    "OG": "System disarm",
    "AG": "Auto arm",
    "HA": "Hooter on locally",
    "ZL": "Hooter off ZCC",
    "DO": "Door open too long",
    "CL": "System Armed",
    "OA": "System Disarmed",
    "OP": "System Opened"
};

/**
 * Decodes Smart-i IIFL 32 Zone SIA-DCS packet string
 * @param {string} message - The raw trimmed message string
 * @returns {object} - The decoded result object
 */
function decodeSIAIIFL(message) {
    const result = {
        account: null,
        code: null,
        event: null,
        zone: null,
        timestamp: null,
        formattedDate: null,
        alertType: null
    };

    if (!message) return result;

    // 1. Extract Timestamp (Format: HH:mm:ss,MM-DD-YYYY or HH:mm:ss,DD-MM-YYYY)
    const timeMatch = message.match(/_(\d{2}:\d{2}:\d{2}),(\d{2})-(\d{2})-(\d{4})/);
    if (timeMatch) {
        const time = timeMatch[1];  // HH:mm:ss
        const month = timeMatch[2]; // MM
        const day = timeMatch[3];   // DD
        const year = timeMatch[4];  // YYYY

        result.timestamp = `${time},${month}-${day}-${year}`;
        result.formattedDate = `${year}-${month}-${day} ${time}`;
    }

    // 2. Extract Data inside brackets [...]
    const bracketMatch = message.match(/\[(.*?)\]/);
    if (bracketMatch) {
        const content = bracketMatch[1];
        const parts = content.split("|");

        if (parts.length > 1) {
            result.account = parts[0].replace("#", "").trim();
            const eventPart = parts[1].trim(); // e.g. "NBA001", "NBR001", "NCG001", "NHA001", "NZL001", "NDO003"

            let codeZonePart = eventPart;
            if (eventPart.includes('/')) {
                codeZonePart = eventPart.split('/')[1];
            } else if (eventPart.startsWith('N')) {
                codeZonePart = eventPart.substring(1);
            }

            // Extract code (2 chars) and zone (remainder)
            result.code = codeZonePart.substring(0, 2);
            result.zone = codeZonePart.substring(2);

            // Step 1: Direct Event Code Lookup (e.g. NBA001, NBR001, NCG001, NOG001, NHA001, NZL001, NDO003, etc.)
            const fullCode = eventPart.startsWith('N') ? eventPart : `N${eventPart}`;
            if (EVENT_CODE_MAP[fullCode]) {
                const match = EVENT_CODE_MAP[fullCode];
                result.event = match.name;
                result.zone = match.zone;
                result.code = match.code;
                result.alertType = match.alertType;
                return result;
            }

            // Step 2: System events prefix match
            if (eventPart === 'NCG001' || eventPart === 'NCF001') {
                result.event = "System arm";
                result.code = "CG";
            } else if (eventPart === 'NOG001' || eventPart === 'NOF001') {
                result.event = "System disarm";
                result.code = "OG";
            } else if (eventPart === 'NAG001') {
                result.event = "Auto arm";
                result.code = "AG";
            } else if (eventPart === 'NHA001' || eventPart.startsWith('NHA')) {
                result.event = "Hooter on locally";
                result.code = "HA";
            } else if (eventPart === 'NZL001' || eventPart === 'NZL') {
                result.event = "Hooter off ZCC";
                result.code = "ZL";
            } else if (eventPart === 'NDO003' || eventPart.startsWith('NDO')) {
                result.event = "Door open too long";
                result.code = "DO";
                result.zone = result.zone || "003";
            } else if (eventPart === 'NCP001') {
                result.event = "System Partial Arm";
                result.code = "CP";
            } else if (eventPart === 'NZZ014') {
                result.event = "System Restarted (Power On)";
                result.code = "ZZ";
            } else if (eventPart === 'NZZ027') {
                result.event = "System Initialized with default settings";
                result.code = "ZZ";
            } else if (eventPart.startsWith('NZH')) {
                result.event = `Output ${eventPart.substring(3)} Activated`;
            } else if (eventPart.startsWith('NZL')) {
                result.event = `Output ${eventPart.substring(3)} Deactivated`;
            } else if (eventPart.startsWith('NCG')) {
                result.event = `System Arm for Group No.- ${eventPart.substring(3)}`;
            } else if (eventPart.startsWith('NOG')) {
                result.event = `System Disarm for Group No.- ${eventPart.substring(3)}`;
            } else if (eventPart.startsWith('NAG')) {
                result.event = `Auto Arm for Group No.- ${eventPart.substring(3)}`;
            } else if (eventPart.startsWith('NOL')) {
                result.event = `Zone ${eventPart.substring(eventPart.length - 3)} open too long`;
            } else {
                // Step 3: Zone Map Lookup
                const zoneInfo = ZONE_MAP[result.zone];
                if (zoneInfo) {
                    if (result.code === zoneInfo.alarmCode) {
                        result.event = zoneInfo.name;
                        result.alertType = zoneInfo.alertType;
                    } else if (result.code === zoneInfo.restoreCode) {
                        result.event = `${zoneInfo.name} Restoral`;
                        result.alertType = zoneInfo.alertType;
                    } else {
                        result.event = `${zoneInfo.name} (${GENERIC_EVENTS[result.code] || result.code})`;
                    }
                } else {
                    result.event = GENERIC_EVENTS[result.code] || `Unknown Event (${result.code})`;
                }
            }
        }
    }

    return result;
}

decodeSIAIIFL.EVENT_CODE_MAP = EVENT_CODE_MAP;
decodeSIAIIFL.ZONE_MAP = ZONE_MAP;
decodeSIAIIFL.GENERIC_EVENTS = GENERIC_EVENTS;

module.exports = decodeSIAIIFL;
