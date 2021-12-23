const Net = require('net');

class Vixen {

    #cols;
    #client;
    #handle;
    #currentREQ;
    #updateOptions;
    #readData;

    /**
     * 
     * @param {Object} options 
     * @param {Number} options.port - Vixen server port - Default: 10010 - Live: 10000, Test: 10010
     * @param {String} options.host - IP address of Vixen server - Default: null
     * @param {String} options.login - Vixen login username - Default: null - Any login will do, the port controls the data area
     * @param {String} options.password - Vixen login password - Default: null - Any login will do, the port controls the data area
     * @param {Boolean} options.debug - Show additional logging - Default: false
     */
    constructor(options) {
        this.options = Object;
        this.options.port = options.port ? options.port : 10010;
        this.options.host = options.host ? options.host : null;
        this.options.login = options.login ? options.login : null;
        this.options.password = options.password ? options.password : null;
        this.options.debug = options.debug ? options.debug : false;
        this.#cols = [];
        this.#client = null;
        this.#handle = null;
        this.#currentREQ = 'LOGIN';
        this.#updateOptions = null;
        this.#readData = [];
    }

    /**
     * 
     * @param {String} event - Event Listener Type 
     * @param {String} message - Message to send
     */
    #sendVixenData(message){
        if (this.options.debug) console.log(`Sending ${message}`);
        if(!this.#client) throw new Error('Vixen client connection has not been established');
        this.#client.write(`~SM~${message}~EM~`);
    }

    #initializeDataListeners(client){
        client.on('data', chunk => {
            chunk = chunk.toString();
            if (this.options.debug) console.log(`Data received from the server: ${chunk}`);
            chunk = chunk.substring(0, chunk.length - 1);

            switch (this.#currentREQ) {
                case 'LOGIN':
                    if(chunk !== '0'){
                        throw new Error('Authentication failed');
                    }
                    return this.#currentREQ = 'HANDLE';
                case 'HANDLE': 
                    this.#handle = chunk;
                    this.#currentREQ = 'OPEN';
                    return this.#sendVixenData(`OPEN?${this.#handle}?0?${this.#updateOptions.file}?LOCAL`);
                    break;
                case 'OPEN':
                    if(chunk.substr(0,1) !== '0') throw new Error('File failed to open');
                    this.#currentREQ = 'COLUMNS';
                    return this.#sendVixenData('JAVAVAR');
                    break;
                case 'COLUMNS':
                    this.#cols.push('__isam__');
                    let tempCols = chunk.split('?');
                    for(let c=0;c<tempCols.length;c+=3){
                        if(tempCols[c] == '') continue;
                        this.#cols.push(tempCols[c]);
                    }
                    this.#currentREQ = 'READ';
                    return this.#sendVixenData(`READ?${this.#handle}?${this.#updateOptions.job}?2?0?`);
                    break;
                case 'READ':
                    let tempData = chunk.split('?');
                    for(let c = 0; c<tempData.length; c++) this.#readData.push(tempData[c]);
                    if(this.#readData[0] == '31') throw new Error(`Record not found`);
                    if(this.#readData[0] == '23') throw new Error(`Record Locked`);
                    if(this.#readData[0] !== '0') throw new Error(`ISAM Error ${this.#readData[0]}`);
                    let message = `WRITE?${this.#handle}?2?1?`;
                    this.#cols.forEach((c, i) => {
                        if(c !== '__isam__'){
                            if(this.#updateOptions.fields[c] !== undefined) this.#readData[i] = this.#updateOptions.fields[c];
                            message += `${this.#readData[i]}?`;
                        }
                    });
                    this.#currentREQ = 'UPDATE';
                    return this.#sendVixenData(message);
                    break;
                case 'UPDATE':
                    let result = chunk.split('?');
                    if(result[0] !== '0') throw new Error(`ISAM Update Error: ${result[0]}`);
                    if(this.options.debug) console.log('Vixen Update Complete');
                    this.#cols = [];
                    this.#currentREQ = 'HANDLE';
                    this.#readData = [];
                    this.#handle = null;
                    this.#updateOptions = null;
                    break;
                default:
                    throw new Error(`Unhandled Step: ${this.#currentREQ}`);
            }
        });

        client.on('end', () => {
            console.error('Vixen connection lost!');
            process.exit();
        });
    }

    connect() {
        this.#client = new Net.Socket().connect(this.options.port, this.options.host, () => {
            if (this.options.debug) console.log('TCP connection established with the server');
            this.#initializeDataListeners(this.#client);
            this.#sendVixenData(`LOGIN?${this.options.login}?${this.options.password}?JAVA`);
        });
    }

    /**
     * 
     * @callback requestCallback
     * @param {errorResponse} error
     * @param {String} response
     */

    /**
     * Vixen ISAM Files are made up of a name and a unit to identify them. Appointment Date is help in SEXJOB.FL/34
     * @param {Object} options
     * @param {String} options.file - Filename to update
     * @param {Number} options.unit - Unit Number
     * @param {String} options.job - Primary Key Value (Company+Job+Sub)
     * @param {Object} options.fields - Fields to update
     */
    update(options) {
        options = options ? options : {};
        options.file = options.file ? options.file : null;
        options.unit = options.unit ? options.unit : null;
        options.job = options.job ? options.job : null;
        options.fields = options.fields ? options.fields : {};
        this.#updateOptions = options;

        if(!options.unit) throw new Error(`No unit number was provided`);
        this.#sendVixenData(`NEWCLASS?${options.unit}`);
    }

    /**
     * 
     * @param {callbackFunction} callback 
     * @returns 
     */
    end(callback){
        this.#client.end();
        return callback();
    }
}

module.exports = Vixen;