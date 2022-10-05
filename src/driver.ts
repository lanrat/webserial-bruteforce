

// must satisfy WebSerial API
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API

//import {serial as polyfillSerial, SerialPort as polyFillSerialPort} from "web-serial-polyfill";

import { polySerial } from  "./polyfill";

export enum Driver {
    WebSerial,
    PolyFill,
}


//export interface SerialMux extends Serial
// cant extend because polyfill is missing some properties
export interface SerialMux {
    //onconnect: ((this: this, ev: Event) => any) | null;
    //ondisconnect: ((this: this, ev: Event) => any) | null;

    getPorts(): Promise<SerialPortMux[]>;
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPortMux>;

    addEventListener(
        type: 'connect' | 'disconnect',
        listener: (this: this, ev: Event) => any,
        useCapture?: boolean): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions): void;
    removeEventListener(
        type: 'connect' | 'disconnect',
        callback: (this: this, ev: Event) => any,
        useCapture?: boolean): void;
    removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean): void;
}

export interface SerialPortMux {
    // onconnect?: ((this: this, ev: Event) => any) | null;
    // ondisconnect?: ((this: this, ev: Event) => any) | null;
    readonly readable: ReadableStream<Uint8Array> | null;
    readonly writable: WritableStream<Uint8Array> | null;

    open(options: SerialOptions): Promise<void>;
    setSignals(signals: SerialOutputSignals): Promise<void>;
    getSignals(): Promise<SerialInputSignals>;
    getInfo(): SerialPortInfo;
    close(): Promise<void>;

    forget?(): Promise<void>; // TODO handle this better....

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

function initPolyFill(): SerialMux {
    //let driver:SerialMux = polyfillSerial;
    let driver:SerialMux = polySerial();
    //driver.name = "web-serial-polyfill";
    // add fake forget method if not implemented...
    // if (! ("forget" in SerialPort.prototype)) {
    //     console.log("System does not implement SerialPort.forget()");
    //     SerialPort.prototype.forget = function () {
    //         console.error("unable to forget port, not supported.");
    //     };
    // }
    return driver;
}

// from w3c web serial
/*
declare class SerialFoo extends EventTarget {
    onconnect: ((this: this, ev: Event) => any) | null;
    ondisconnect: ((this: this, ev: Event) => any) | null;

    getPorts(): Promise<SerialPort[]>;
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
    addEventListener(
        type: 'connect' | 'disconnect',
        listener: (this: this, ev: Event) => any,
        useCapture?: boolean): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions): void;
    removeEventListener(
        type: 'connect' | 'disconnect',
        callback: (this: this, ev: Event) => any,
        useCapture?: boolean): void;
    removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean): void;
}

declare class SerialPort extends EventTarget {
    onconnect: ((this: this, ev: Event) => any) | null;
    ondisconnect: ((this: this, ev: Event) => any) | null;
    readonly readable: ReadableStream<Uint8Array> | null;
    readonly writable: WritableStream<Uint8Array> | null;

    open(options: SerialOptions): Promise<void>;
    setSignals(signals: SerialOutputSignals): Promise<void>;
    getSignals(): Promise<SerialInputSignals>;
    getInfo(): SerialPortInfo;
    close(): Promise<void>;

    addEventListener(
        type: 'connect' | 'disconnect',
        listener: (this: this, ev: Event) => any,
        useCapture?: boolean): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions): void;
    removeEventListener(
        type: 'connect' | 'disconnect',
        callback: (this: this, ev: Event) => any,
        useCapture?: boolean): void;
    removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean): void;
}
*/

// add properties to SerialPort
// interface SerialPort {
//     forget: () => void;

// }

// export interface SerialOptions {
//     [key: string]: any
// }

export interface SerialOptionsMux extends SerialOptions{
    [key: string]: any
    // baudRate: number;
    // dataBits?: number | undefined;
    // stopBits?: number | undefined;
    // parity?: ParityType | undefined;
    // bufferSize?: number | undefined;
    // flowControl?: FlowControlType | undefined;
}

export interface SerialInputSignalsMux extends SerialInputSignals {
    [key: string]: any
}

export function requestDriver(name: string): Driver | null {
    name = name.toLocaleLowerCase();
    switch (name) {
        case "webserial":
            return Driver.WebSerial;
        case "polyfill":
            return Driver.PolyFill;
    }

    return null;
}


export function detectDriver(): Driver | null {
    if ("serial" in navigator) {
        return Driver.WebSerial;
    }
    if ("usb" in navigator) {
        return Driver.PolyFill;
    }

    return null;
}

export function getDriver(selected: Driver): SerialMux {
    let driver: SerialMux;

    switch (selected) {
        case Driver.WebSerial:
            driver = initWebSerial();
            break;
        case Driver.PolyFill:
            driver = initPolyFill();
            break;
    }

    return driver;
}

function initWebSerial(): SerialMux {
    let driver:SerialMux = navigator.serial;
    //driver.name = "webserial";
    // add fake forget method if not implemented...
    // if (!("forget" in SerialPort.prototype)) {
    //     console.log("System does not implement SerialPort.forget()");
    //     SerialPort.prototype.forget = function () {
    //         console.error("unable to forget port, not supported.");
    //     };
    // }

    return driver;
}


