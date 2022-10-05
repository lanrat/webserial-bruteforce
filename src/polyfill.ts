import { serial as polyfillSerial, Serial as pSerial, SerialPort as polyFillSerialPort } from "web-serial-polyfill";

/** implementation of the global navigator.serial object */
export class PolyfillSerialMod {
    private polySerial: pSerial;
    onconnect: ((this: this, ev: Event) => any) | null = null;
    ondisconnect: ((this: this, ev: Event) => any) | null = null;

    constructor(polySerial: pSerial) {
        this.polySerial = polySerial;
    }

    async requestPort(options?: SerialPortRequestOptions): Promise<PolyfillSerialPortMod> {
        var polyPort = await this.polySerial.requestPort(options);
        var port = new SerialPortModImpl(polyPort);
        return port;
    }

    async getPorts(): Promise<PolyfillSerialPortMod[]> {
        var polyPorts = await this.polySerial.getPorts();
        var ret:PolyfillSerialPortMod[] =[];
        for (const i in polyPorts) {
            let port = new SerialPortModImpl(polyPorts[i]);
            ret.push(port)
        }
        return ret;
    }

    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions): void {
            // TODO
            console.error("polyfill addEventListener() unimplemented!");
    }

    removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean): void {
            // TODO
            console.error("polyfill removeEventListener() unimplemented!");
    }
}

export interface PolyfillSerialPortMod {
    // onconnect?: ((this: this, ev: Event) => any) | null;
    // ondisconnect?: ((this: this, ev: Event) => any) | null;
    readonly readable: ReadableStream<Uint8Array> | null;
    readonly writable: WritableStream<Uint8Array> | null;

    open(options: SerialOptions): Promise<void>;
    setSignals(signals: SerialOutputSignals): Promise<void>;
    getSignals(): Promise<SerialInputSignals>;
    getInfo(): SerialPortInfo;
    close(): Promise<void>;
    forget(): Promise<void>;

    // addEventListener(
    //     type: 'connect' | 'disconnect',
    //     listener: (this: this, ev: Event) => any,
    //     useCapture?: boolean): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions): void;
    // removeEventListener(
    //     type: 'connect' | 'disconnect',
    //     callback: (this: this, ev: Event) => any,
    //     useCapture?: boolean): void;
    removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean): void;
}

export class SerialPortModImpl {
    private polyPort: polyFillSerialPort;

    constructor(polyPort: polyFillSerialPort) {
        this.polyPort = polyPort;
    }

    public async open(options: SerialOptions): Promise<void> {
        return this.polyPort.open(options);
    }

    public async setSignals(signals: SerialOutputSignals): Promise<void> {
        return this.polyPort.setSignals(signals);
    }

    public async getSignals(): Promise<SerialInputSignals> {
        return this.polyPort.getSignals();
    }

    public getInfo(): SerialPortInfo {
        return this.polyPort.getInfo();
    }

    public async close(): Promise<void> {
        return this.polyPort.close();
    }

    public get readable(): ReadableStream<Uint8Array> | null {
        return this.polyPort.readable;
    }

    public get writable(): WritableStream<Uint8Array> | null {
        return this.polyPort.writable;
    }

    public async forget(): Promise<void> {
        console.error("polyfill port forget() unimplemented!");
        // TODO
    }

    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions): void {
            console.error("polyfill port addEventListener() unimplemented!");
            // TODO
    }
    
    removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean): void {
            // TODO
            console.error("polyfill port removeEventListener() unimplemented!");
    }

}

export function polySerial(): PolyfillSerialMod {
    var serial = new PolyfillSerialMod(polyfillSerial);
    return serial;
}