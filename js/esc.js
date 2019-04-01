const ENCODER = new TextEncoder("utf-8");

const PRINTER_SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const PRINTER_CHAR = "00002af1-0000-1000-8000-00805f9b34fb";

//const codes
const ESC = 0x1B;
const GS = 0x1D;

const CMD_SIZE = 0x21;
const CMD_UNDERLINE = 0x2D;
const CMD_RESET = 0x40;
const CMD_INVERSE = 0x42;
const CMD_BOLD = 0x45;
const CMD_FONT = 0x4D;
const CMD_JUSTIFY = 0x61;
const CMD_FEED = 0x64;

function mergeTypedArraysUnsafe(a, b) {
    var c = new a.constructor(a.length + b.length);
    c.set(a);
    c.set(b, a.length);

    return c;
}

class ESCPrinter{
    constructor(printer  = null) {
        this.printer = printer;
        this.promise = null;
        this.connListener = null;
        this.int_buffer = new Uint8Array(512);
        this.int_pos = 0;
        
        this.init_qr_buffer = function(buffer){
            buffer[0] = GS;
            buffer[1] = 0x28;
            buffer[2] = 0x6B;
            buffer[3] = 3;
            buffer[4] = 0;
            buffer[5] = 49;
        }
    }
    
    resolve(){
        var tmp = this;
        resolveChar(c => {
            tmp.printer = c;
            if(tmp.connListener != null){
                tmp.connListener(true);
            }
        }, function(event){
            tmp.printer = null;
            console.log("Disconnected!");
            if(tmp.connListener != null){
                tmp.connListener(false);
            }
        });
    }
    
    setConnListener(handler){
        this.connListener = handler;
    }
    
    ready(){
        return this.printer != null;
    }
    
    write(value){
        if(this.promise == null){
            this.promise = this.printer.writeValue(value);
        }else{
            this.promise = this.promise.then(c => this.printer.writeValue(value));
        }
    }
    
    reset(){
        this.writeDouble(ESC, CMD_RESET);
    }
    
    printText(text){
        this.storeText(text + "\r\n");
    }
    
    storeText(text){
        this.write(ENCODER.encode(text));
    }
    
    writeSingle(cmd){
        var buffer = new Uint8Array(1);
        buffer[0] = cmd;
        this.write(buffer);
    }
    
    writeDouble(cmd, param){
        var buffer = new Uint8Array(2);
        buffer[0] = cmd;
        buffer[1] = param;
        console.log("writeDouble(" + buffer + ")");
        this.write(buffer);
    }
    
    writeTri(cmd, param1, param2){
        var buffer = new Uint8Array(3);
        buffer[0] = cmd;
        buffer[1] = param1;
        buffer[2] = param2;
        console.log("writeTri(" + buffer + ")");
        this.write(buffer);
    }
    
    feed(count=1){
        this.writeTri(ESC, CMD_FEED, count);
    }
    
    bold(bold=1){
        this.writeTri(ESC, CMD_BOLD, bold > 0 ? 1 : 0);
    }
    
    inverse(inverse = 0){
        this.writeTri(ESC, CMD_INVERSE , inverse > 0 ? 1 : 0);
    }
    
    underline(weight=0){
        this.writeTri(ESC, CMD_UNDERLINE, weight > 2 ? 2 : weight < 0 ? 0 : weight);
    }
    
    justify(pos = 0){
        this.writeTri(ESC, CMD_JUSTIFY, pos > 2 ? 2 : pos < 0 ? 0 : pos);
    }
    
    font(font = 0){
        this.writeTri(ESC,CMD_FONT, font > 1 ? 1 : 0);
    }
    
    size(width=1,height=1){
        if(width < 1){
            width = 1
        }
        if(width > 8){
            width = 8;
        }
        if(height < 1){
            height = 1
        }
        if(height > 8){
            height = 8;
        }
        width--;
        height--;
        width *= 16;
        var value = width;
        value += height;
        this.writeTri(ESC, CMD_SIZE, value);
    }
    
    printQR(str, errCorrection=50, size=8){
        var tmp = new Uint8Array(8);
        this.init_qr_buffer(tmp);
        
        //store data
        tmp[3] = str.length + 3;
        tmp[6] = 80;
        tmp[7] = 48;
        var buffer = mergeTypedArraysUnsafe(tmp, ENCODER.encode(str));
        tmp[3] = 3; // reset to 3 after setting the size
        
        //set error correction level
        tmp[6] = 69;
        tmp[7] = errCorrection;
        buffer = mergeTypedArraysUnsafe(buffer, tmp);
        
        //set qr code size
        tmp[6] = 67;
        tmp[7] = size;
        buffer = mergeTypedArraysUnsafe(buffer, tmp);
        
        //print qr code
        tmp[6] = 81;
        tmp[7] = 48;
        buffer = mergeTypedArraysUnsafe(buffer, tmp);
        this.write(buffer);
    }

    printBarcode(code, type=73, h=50, w=2, font=0, pos=0){
        this.writeTri(GS, 0x48, pos);
        this.writeTri(GS, 0x66, font);
        this.writeTri(GS, 0x68, h);
        this.writeTri(GS, 0x77, w);
        this.writeTri(GS, 0x6B, type);
        this.writeSingle(code.length);
        this.write(ENCODER.encode(code));
    }
}

function resolveChar(resolve, disconnect=null){
    return navigator.bluetooth.requestDevice({ filters: [{
                services: [PRINTER_SERVICE]
              }] })
            .then(device => {
                if(disconnect != null){
                    device.addEventListener("gattserverdisconnected", disconnect);
                }
            return device.gatt.connect();
            })
            .then(server => server.getPrimaryService(PRINTER_SERVICE))
            .then(service => service.getCharacteristic(PRINTER_CHAR))
            .then(resolve)
            .catch(error => { console.error("Exception Thrown", error); });
}