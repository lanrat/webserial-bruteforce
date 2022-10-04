"use strict";
// must satisfy WebSerial API
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
//import {serial as polyfillSerial, SerialPort as polyFillSerialPort} from "web-serial-polyfill";
var Driver;
(function (Driver) {
    Driver[Driver["WebSerial"] = 0] = "WebSerial";
    //PolyFill,
})(Driver || (Driver = {}));
function detectDriver() {
    if ("serial" in navigator) {
        return Driver.WebSerial;
    }
    // if ("usb" in navigator) {
    //     return Driver.PolyFill;
    // }
    return null;
}
function getDriver(selected) {
    let driver;
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
function initWebSerial() {
    let driver = navigator.serial;
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
//# sourceMappingURL=driver.js.map