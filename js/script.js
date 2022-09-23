
const allOptions = {
    baudRate: [9600, 14400, 19200, 38400, 57600, 115200],
    //dataBits: [7,8],
    //flowControl: ["none", "hardware"],
    //parity: ["none", "even", "odd"],
    //stopBits: [1,2]
}

const restartElem = document.getElementById("restart");

function GetOptions() {
    var out = [];
    // TODO this can likely be made faster with reduce() or iterators
    for (var prop in allOptions) {
        if (Object.prototype.hasOwnProperty.call(allOptions, prop)) {
            // do stuff
            // TODO support other options
            for (var i = 0; i < allOptions[prop].length; i++) {
                var o = {};
                o[prop] = allOptions[prop][i];
                out.push(o);
            }
        }
    }

    return out;
}

async function bruteForce(port) {
    var options = GetOptions();
    var results = [];
    console.log("testing all options:", options);
    for (const i in options) {
        if (!port.running) {
            // break early if need
            // TODO find a better way
            console.log("port no longer running, exiting early");
            port.resultsElem.innerText = "";
            return;
        }
        var result = await testSetting(port, options[i]);
        results.push(result);
        console.log("result for:", result);
    }
    results.sort((a, b) => (a.pStr < b.pStr) ? 1 : -1);
    console.log("all results:", results);
    console.log("most likely result:", results[0]);
    port.running = false;

    if (results[0].len > 0) {
        port.resultsElem.innerText = results[0].options.baudRate;
    } else {
        port.resultsElem.innerText = "no response data";
    }
}

async function testSetting(port, option) {
    console.log("testing:", option);
    const testDuration = 3; // TODO configurable
    await port.open(option).catch((e) => {
        console.error("port open error", e);
        port.running = false;
        showError(e);
    });
    await restart(port);

    port.resultsElem.innerText = `testing ${option.baudRate}`;

    var strLen = 0;
    var dataLen = 0;

    // setup text filter stream
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();

    //const textEncoder = new TextEncoderStream();
    //const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
    //const writer = textEncoder.writable.getWriter();

    //const writer = port.writable.getWriter();
    //const writeData =  new Uint8Array("\r\n?\r\n");
    //const writeData = new Uint8Array(['\r','\r']);


    // close port after test duration
    port.abort = async function() {
            await reader.cancel();
            //await writer.close();
        clearTimeout(port.abortTimeout);
    }
    port.abortTimeout = setTimeout(port.abort, testDuration * 1000);
    var testStr = "";

    // Listen to data coming from the serial device.
    while (true) {
        // send some data
        //console.log("waiting for write...");
        //writer.write(writeData);

        console.log("waiting for read...");

        // read some data
        const { value, done } = await reader.read();
        if (done || !port.running) {
            // Allow the serial port to be closed later.
            reader.releaseLock();
            //writer.releaseLock(); // TODO testing
            break;
        }

        // write test to help generate text
        // TODO this does not work
        //await writer.write("\r\n?\r\n");

        // value is a string.
        var printable = value.replace(/[^\x20-\x7E]/g, '');

        console.log("\tgot data:", value);
        console.log("\tgot str:", printable);
        
        strLen += printable.length;
        dataLen += value.length;
        testStr += printable;
    }

    // wait for everything to cleanup
    await readableStreamClosed.catch(() => { /* Ignore the error */ });
    //await writableStreamClosed;
    await port.close();

    //console.log("str:", testStr);
    //console.log("result for", option, strLen);
    delete port.abort;
    clearTimeout(port.abortTimeout);
    return {
        options: option,
        len: strLen,
        dataLen: dataLen,
        string: testStr,
        strDelta: dataLen - strLen,
        pStr: strLen / dataLen
    };
}

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function restart(port) {
    if (restartElem.checked) {
        port.resultsElem.innerText = `restarting...`;
        await RtsRestart(port);
    }
}

// restart by handling rts pin
async function RtsRestart(port) {
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });
    await delay(100);
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
}


document.addEventListener('DOMContentLoaded', async () => {
    if (!window.isSecureContext) {
        console.log("page is loaded over insecure context, exiting");
        showError("WebSerial requires page to be over secure context");
        return;
    }
    if ("serial" in navigator) {
        // The Web Serial API is supported.
        document.getElementById("warnBlock").hidden = true;
    } else {
        console.log("WebSerial support not detected");
        showError("WebSerial support not detected");
        return;
    }

    navigator.serial.getPorts().then((ports) => {
        // Initialize the list of available ports with `ports` on page load.
        for (const port of ports) {
            addTablePort(port);
        }
    });
});


function showError(msg) {
    var dialogElem = document.getElementById('dialog');
    var dialogMessageElem = document.getElementById('dialogError');
    dialogMessageElem.innerText = msg;
    dialogElem.showModal();
}

async function forgetPorts() {
    navigator.serial.getPorts().then((ports) => {
        for (const port of ports) {
            console.log(`forgetting port: ${port.name}`);
            port.close().catch(() => { /* Ignore the error */ });;
            if ("serial" in navigator && "forget" in SerialPort.prototype) {
                // check forget() is supported.
                port.forget();
            }
            port.row.remove();
        }

    });
}


function addPort() {
    navigator.serial.requestPort().then((port) => {
        addTablePort(port);
    }).catch((e) => {
        // The user didn't select a port.
        console.log("no port selected. event:", e);
    });
}

const portsTableElem = document.getElementById("portsTable");

navigator.serial.addEventListener('connect', (e) => {
    // Connect to `e.target` or add it to a list of available ports.
    console.log("connect event: ", e);
    addTablePort(e.target);
});

navigator.serial.addEventListener('disconnect', (e) => {
    // Remove `e.target` from the list of available ports.
    console.log("disconnect event: ", e);
    e.target.running = false;
    e.target.row.remove();
});

function addTablePort(port) {
    port.row = portsTableElem.insertRow(0);
    port.info = port.getInfo();
    port.name = `serial://${port.info.usbVendorId}:${port.info.usbProductId}`;

    // add button
    port.btn = document.createElement("button");

    const RunningButtonText = "Stop";
    const StoppedButtonText = "Start";

    if (!port.hasOwnProperty("running")) {
        Object.defineProperty(port, "running", {
            get() {
                return (port.btn.innerText == RunningButtonText);
            },
            set(v) {
                if (v) {
                    port.btn.innerText = RunningButtonText;
                } else {
                    port.btn.innerText = StoppedButtonText;
                }
            }
        });
    }

    port.running = false;

    // name col
    port.nameElem = document.createElement("code");
    port.nameElem.innerText = port.name;
    port.row.insertCell().appendChild(port.nameElem);

    // button col
    port.btn.onclick = debounce(() => goButton(port));
    port.row.insertCell().appendChild(port.btn);

    // results
    port.resultsElem = document.createElement("p");
    port.row.insertCell().appendChild(port.resultsElem);
}

function goButton(port) {
    // update button state
    port.running = !port.running;
    if (port.running) {
        bruteForce(port);
    } else {
       if (port.abort) {
            port.abort();
       }
    }
}

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        if (!timer) {
            func.apply(this, args);
        }
        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
        }, timeout);
    };
}
