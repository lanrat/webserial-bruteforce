
import { detectDriver, Driver, getDriver, SerialMux, SerialPortMux, SerialOptionsMux, SerialInputSignalsMux, requestDriver} from "./driver";

// TODO options to select these...
const allOptions = {
    baudRate: [9600, 14400, 19200, 38400, 57600, 115200],
    //dataBits: [7,8],
    //flowControl: ["none", "hardware"],
    //parity: ["none", "even", "odd"],
    //stopBits: [1,2]
}


const warnBlockElem = document.getElementById("warnBlock")!;

const dialogElem = document.getElementById('dialog')! as HTMLDialogElement;
const dialogMessageElem = document.getElementById('dialogError')!;

const portsTableElem = document.getElementById("portsTable")! as HTMLTableElement;

var serialDriver: SerialMux;

// TODO make ACM devices (flipper) get data....
// TODO currently need no reset to make work?
// TODO fallback option for android devices: https://github.com/google/web-serial-polyfill

const restartElem = document.getElementById("restart")! as HTMLInputElement;
const testDurationElem = document.getElementById("testTime")! as HTMLInputElement;
const writeTextElem = document.getElementById("writeText")! as HTMLInputElement;

const RunningButtonText = "Stop";
const StoppedButtonText = "Start";


var metaPorts = new WeakMap<SerialPortMux, SerialPortMeta>();

class SerialPortMeta {
    port: SerialPortMux;
    name: string;
    info: SerialPortInfo;
    private running_: boolean;
    private abort_: (() => void) | null;
    private stopWatchSignals: (() => void) | null;
    private watchID: number;
    row: HTMLTableRowElement;
    btn: HTMLButtonElement;
    resultsElem: HTMLElement;

    constructor(port: SerialPortMux) {
        this.port = port;
        this.watchID = 0;
        this.abort_ = null;
        this.stopWatchSignals = null;
        this.running_ = false;
        this.row = portsTableElem.insertRow(0);;
        this.info = port.getInfo();
        this.name = `serial://${this.info.usbVendorId}:${this.info.usbProductId}`;
        this.btn = document.createElement("button")! as HTMLButtonElement;

        // name col
        const nameElem = document.createElement("code");
        nameElem.innerText = this.name;
        this.row.insertCell().appendChild(nameElem);

        // button col
        this.btn.onclick = debounce(() => goButton(this));
        this.row.insertCell().appendChild(this.btn);

        // forget button
        const forgetBtnElem = document.createElement("button");
        forgetBtnElem.innerText = "Forget";
        const meta = this;
        forgetBtnElem.onclick = function () {
            meta.remove();
        };
        this.btn.parentElement!.appendChild(forgetBtnElem);

        // results
        this.resultsElem = document.createElement("p");
        this.row.insertCell().appendChild(this.resultsElem);

        // disconnect listener
        this.port.addEventListener('disconnect', (e) => {
            // Remove `e.target` from the list of available ports.
            console.log("disconnect event: ", e);
            this.remove();
        });

        metaPorts.set(this.port, this);
        this.running = false;
    }

    remove() {
        this.running = false;
        this.row.remove();
        metaPorts.delete(this.port);
        //this.port.forget(); // TODO fix forget();
    }

    get running() {
        return this.running_;
    }
    set running(v: boolean) {
        this.running_ = v;
        this.btn.innerText = (v) ? RunningButtonText : StoppedButtonText;
    }

    abort() {
        if (this.abort_) {
            this.abort_();
        }
    }

    async watchSignals() {
        const signalCheckDelay = 100;
        console.log(`watching signals for ${this.name}`);
        this.stopWatchSignals = async function () {
            if (this.watchID) {
                console.log(`stopping signals for ${this.name}`);
                clearTimeout(this.watchID);
                this.watchID = 0;
                this.stopWatchSignals = null;
            }
        };

        var signals:SerialInputSignalsMux = await this.port.getSignals();

        const metaPort = this;

        (function loop() {
            metaPort.watchID = window.setTimeout(async () => {
                // watch logic here
                if (!metaPort.running && metaPort.stopWatchSignals) {
                    metaPort.stopWatchSignals();
                    return;
                }
                try {
                    var newSignals = await metaPort.port.getSignals();
                    let changes = Object
                        .entries(newSignals)
                        .filter(([key, value]) => value !== signals[key])
                    if (changes.length > 0) {
                        console.log(`!!! new signals for ${metaPort.name}:`, changes);
                        signals = newSignals;
                    }
                } catch (e) {
                    console.log("watchSignals: ", e);
                }
                loop();
            }, signalCheckDelay);
        })();
    }

    async restart() {
        if (config.restart) {
            this.resultsElem.innerText = `restarting...`;
            console.log(`${this.name} restarting`);
            await RtsRestart(this.port);
        }
    }

    async testSetting(option: SerialOptions) {
        console.log(`${this.name} testing:`, option);
        await this.port.open(option).catch((e) => {
            //console.error("port open error", e);
            this.running = false;
            // can happen when using web-serial-polyfill on a device when the kernel has claimed the USB-serial device
            showError(e);
            throw e;
        });
        await this.watchSignals();
        await this.restart();

        this.resultsElem.innerText = `testing ${option.baudRate}`;

        var strLen = 0;
        var dataLen = 0;

        // setup text filter stream
        const textDecoder = new TextDecoderStream();
        if (!(this.port.readable)) {
            throw new Error(`port is not readable: ${this.name}`);
        }
        const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();

        //const textEncoder = new TextEncoderStream();
        //const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
        //const writer = textEncoder.writable.getWriter();

        //const writer = port.writable.getWriter();
        //const writeData =  new Uint8Array("\r\n?\r\n");
        //const writeData = new Uint8Array(['\r','\r']);


        // close port after test duration
        //console.log("running test for:", config.test_duration);
        var abortTimeout = setTimeout(this.abort.bind(this), config.test_duration * 1000);
        this.abort_ = async function () {
            //console.log("abort_ called");
            await reader.cancel();
            //await writer.close();
            clearTimeout(abortTimeout);
        }
        var dataStr = "";

        // Listen to data coming from the serial device.
        while (true) {
            // send some data
            //console.log("waiting for write...");
            //writer.write(writeData);

            // this kinda works
            // encoder = new TextEncoder();
            // const dataArrayBuffer = encoder.encode("\r\r\r\n?\r\n");
            // const writer = port.writable.getWriter();
            // writer.write(dataArrayBuffer);
            // writer.releaseLock();

            //console.log("waiting for read...");

            // read some data
            // Note: this can error with web-serial-polyfill if no data has been gathered yet
            const { value, done } = await reader.read();
            if (done || !this.running) {
                // Allow the serial port to be closed later.
                //console.log("releasing lock");
                reader.releaseLock();
                //writer.releaseLock(); // TODO testing
                break;
            }

            // value is a string.
            var printable = value.replace(/[^\x20-\x7E]/g, '');

            //console.log(`${port.name} \n\tgot data:`, value);
            //console.log(`${port.name} \n\tgot str:`, printable);

            strLen += printable.length;
            dataLen += value.length;
            dataStr += printable;
        }

        if (this.stopWatchSignals) await this.stopWatchSignals();

        // wait for everything to cleanup
        await readableStreamClosed.catch((e) => {
            /* Ignore the error */
            //console.error("readableStreamClosed error:", e);
        });
        //await writableStreamClosed;
        //console.log("closing port");
        await this.port.close();
        //console.log("port closed");

        //console.log("str:", testStr);
        //console.log("result for", option, strLen);
        this.abort_ = null;
        clearTimeout(abortTimeout);
        return {
            options: option,
            len: strLen,
            dataLen: dataLen,
            string: dataStr,
            strDelta: dataLen - strLen,
            pStr: strLen / dataLen
        };
    }
}

class config {
    private constructor() { }

    static get test_duration(): number {
        return parseInt(testDurationElem.value);
    }

    static get restart(): boolean {
        return restartElem.checked;
    }

    static get write(): (string | false) {
        if (writeTextElem.value.length > 0) {
            return writeTextElem.value;
        }
        return false;
    }
}


function GetOptions(): SerialOptions[] {
    let out: SerialOptions[] = [];
    // TODO this can likely be made faster with reduce() or iterators
    for (var prop in allOptions) {
        if (Object.prototype.hasOwnProperty.call(allOptions, prop)) {
            // do stuff
            // TODO support other options
            let option = allOptions[prop as keyof typeof allOptions];
            for (var i = 0; i < option.length; i++) {
                var o = <SerialOptionsMux>{};
                o[prop] = option[i];
                out.push(o);
            }
        }
    }

    return out;
}

async function bruteForce(port: SerialPortMeta) {
    var options = GetOptions();
    var results = [];
    console.log(`${port.name} testing all options:`, options);
    for (const i in options) {
        if (!port.running) {
            // break early if need
            console.log(`port ${port.name} no longer running, exiting early`);
            port.resultsElem.innerText = "";
            return;
        }
        var result = await port.testSetting(options[i]);
        results.push(result);
        console.log(`${port.name} result for:`, result);
    }
    results.sort((a, b) => (a.pStr < b.pStr) ? 1 : -1);
    console.log(`${port.name} all results:`, results);
    console.log(`${port.name} most likely result:`, results[0]);
    port.running = false;

    if (results[0].len > 0) {
        port.resultsElem.innerText = String(results[0].options.baudRate);
    } else {
        port.resultsElem.innerText = "no response data";
    }
}


function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}


// restart by handling rts pin
async function RtsRestart(port: SerialPortMux) {
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
    const urlParams = new URLSearchParams(location.search);

    let driver = detectDriver();

    if (urlParams.has('driver')) {
        let driverStr = urlParams.get('driver')!;
        driver = requestDriver(driverStr);
    }

    if (driver != null) { // test if driver is available
        //console.log("detected best driver to use as", Driver[driver]);
        // The Web Serial API is supported.
        warnBlockElem.hidden = true;
        console.log("using serial driver: ", Driver[driver]);
        serialDriver = getDriver(driver);
    } else {
        console.log("WebSerial support not detected");
        showError("WebSerial support not detected");
        return;
    }

    //console.log("using serial driver:", serialDriver.name);

    serialDriver.addEventListener('connect', (e) => {
        // Connect to `e.target` or add it to a list of available ports.
        console.log("connect event: ", e);
        console.log("event", e);
        addPort(e.target as SerialPort);
    });

    serialDriver.getPorts().then((ports) => {
        // Initialize the list of available ports with `ports` on page load.
        for (const port of ports) {
            addPort(port);
        }
    });
});


function showError(msg: string) {
    dialogMessageElem.innerText = msg;
    dialogElem.showModal();
}


const forgetPortsButtonElem = document.getElementById("forgetPortsButton")!;
forgetPortsButtonElem.onclick = async function() {
    serialDriver.getPorts().then((ports) => {
        for (const port of ports) {
            port.close().catch(() => { /* Ignore the error */ });;
            //port.forget(); // TODO fix forget?
            let portMeta = metaPorts.get(port);
            if (portMeta) {
                console.log(`forgetting port: ${portMeta.name}`);
                portMeta.remove();
            }
        }
    });
}


const addPortButtonElem = document.getElementById("addPortButton")!;
addPortButtonElem.onclick = function() {
    serialDriver.requestPort().then((port) => {
        addPort(port);
    }).catch((e) => {
        // The user didn't select a port.
        console.log("no port selected. event:", e);
    });
}

function addPort(port: SerialPortMux) {
    if (metaPorts.has(port)) {
        console.log("selected pre-approved port");
        return;
    }
    let portMeta = new SerialPortMeta(port);
    console.log(`added port: ${portMeta.name}`);
}

function goButton(port: SerialPortMeta) {
    // update button state
    port.running = !port.running;
    if (port.running) {
        bruteForce(port).catch((e) => {
            console.error("bruteForce error", e);
            port.running = false;
            showError(e);
        });
    } else {
        port.abort();
    }
};

const debounce = <F extends (...args: Parameters<F>) => ReturnType<F>>(func: F, waitFor: number = 300,) => {
    let timeout: number | null;
    const debounced = (...args: Parameters<F>) => {
        if (timeout) {
            clearTimeout(timeout);
        } else {
            func(...args);
        }
        timeout = window.setTimeout(() => {
            timeout = null;
        }, waitFor);
    }

    return debounced
}