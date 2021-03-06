# VDI - Vixen Direct Insert

VDI was developed as a way to directly manipulate Causeway Vixen's database without needing to use their API and to bypass the replication database.

**Warning!** - **This process can cause major irreversible issues within the database if great care isn't take**n


## Installation:

Place the `VDI` folder into your application folder.

Require VDI by using:

```javascript
const VDI = require('./VDI/Vixen');
```

## Making a connection:

Before you can manipulate any data, you must first make a connection that the data can be piped through.

```javascript
let vixen = new VDI({
	"host": "127.0.0.1",			// IP address of Vixen server
	"port": 10010, 					// Vixen server port
	"login": "your_login",			// Vixen login username
	"password": "your_password",	// Vixen login password
	"debug": false					// show additional logging (default: false)
});

vixen.connect();
```

## Update a property

The example below shows how to update the appointment date of an individual job.

```javascript
vixen.update({
	"file": "SE/SEXJOB.FL",				// Filename to update
	"unit": 34,							// Unit Number
	"job": "01AB1234001",				// Primary Key Value (company+job+sub)
	"fields": {							// Fields to update
		"SEXJ_APPTDATE": "01052021",	// DDMMYYYY
		"SEXJ_APPTIME": "1600",			// HHmm
	}
});
```

## Files & Fields
