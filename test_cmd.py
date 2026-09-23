import subprocess, os

test_code = """
const smartiIifl = require('./protocols/smarti_iifl');

// We can test by calling queueCommand logic or inspect internal build function
// Let's test buildSIACommand outputs by requiring it or evaluating
console.log('Testing SIREN_ON & SIREN_OFF with zone:');
const net = require('net');

// Create mock socket
const dummySocket = new net.Socket();

console.log('Testing Smart-i IIFL Commands:');
"""

with open('scratch_test_cmd.js', 'w', encoding='utf-8') as f:
    f.write(test_code)

res = subprocess.run(['node', 'scratch_test_cmd.js'], capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print('STDERR:', res.stderr)

try:
    os.remove('scratch_test_cmd.js')
    os.remove('test_cmd.py')
except:
    pass
