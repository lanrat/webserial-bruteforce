

// must satisfy WebSerial API
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API

//import {serial as polyfillSerial, SerialPort as polyFillSerialPort} from "web-serial-polyfill";


enum Driver {
    WebSerial,
    //PolyFill,
}


// Add name to Serial
interface Serial {
}

// add properties to SerialPort
// interface SerialPort {
//     forget: () => void;

// }

interface SerialOptions {
    [key: string]: any
}

interface SerialInputSignals {
    [key: string]: any
}


function detectDriver(): Driver | null {
    if ("serial" in navigator) {
        return Driver.WebSerial;
    }
    // if ("usb" in navigator) {
    //     return Driver.PolyFill;
    // }
    return null;
}

function getDriver(selected: Driver): Serial {
    let driver: Serial;

    switch (selected) {
        case Driver.WebSerial:
            driver = initWebSerial();
            break;
        // case Driver.PolyFill:
        //     driver = initPolyFill();
        //     break;
    }

    return driver;
}

function initWebSerial(): Serial {
    let driver:Serial = navigator.serial;
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



// function initPolyFill(): Serial {
//     let driver = polyfillSerial;
//     //driver.name = "web-serial-polyfill";
//     // add fake forget method if not implemented...
//     // if (! ("forget" in SerialPort.prototype)) {
//     //     console.log("System does not implement SerialPort.forget()");
//     //     SerialPort.prototype.forget = function () {
//     //         console.error("unable to forget port, not supported.");
//     //     };
//     // }
//     return driver;
//}

