const Vixen = require('./Vixen');
const fs = require('fs');

let vixen = new Vixen({
    host: '10.10.1.21',
    port: 10010,
    login: 'vixlive',
    password: 'briter',
    debug: true
});

vixen.connect();

setTimeout(() => {
    vixen.update({
        file: 'SE/SEXJOB.FL',
        unit: 34,
        job: '01SA0025005',
        fields: {
            SEXJ_APPTDATE: '01052021',
            SEXJ_APPTIME: '1600'
        }
    });
}, 2000);
