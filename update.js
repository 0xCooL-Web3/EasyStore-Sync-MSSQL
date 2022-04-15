/*
    refer API: https://documenter.getpostman.com/view/8990390/TzRYc4mn#49991fae-7d61-4384-82e1-59d05f672a71
    (3.0 → Products → [PUT] Updates existing variants)

    ----------------------------------------------------------------------------------------------------

   		    Todolist
    [√] looping compare checking

    ----------------------------------------------------------------------------------------------------
*/
const Conn = require("./class/conn");
const mssql = require("mssql");
const axios = require('axios');
const fs = require('fs');

function Handle(config={}, delay_ms=60*1000){
    //  Custom Properties
    this.delay_ms = delay_ms;
    //  current timestamp
    this.timestamp = new Date();
    //  previous timestamp
    this.previous = null;
    

    //	EasyStore API
	this.shop_domain = fs.readFileSync('setting/shop_domain.txt');
	this.access_token = fs.readFileSync('setting/access_token.txt');

    //	new MSSQL Conneciton
    this.conn = new Conn(config.mssql[0]);
	this.db_config = config.mssql[0];
    this.database = config.mssql[0].database;


    //  get date string format
    this.dateString = (date=new Date()) => {
        let year = date.getFullYear();
        let month = (date.getMonth()+1)<10? '0'+(date.getMonth()+1): (date.getMonth()+1);
        let days = date.getDate()<10? '0'+date.getDate(): date.getDate();
        let hours = date.getHours()<10? '0'+date.getHours(): date.getHours();
        let minute = date.getMinutes()<10? '0'+date.getMinutes(): date.getMinutes();
        let second = date.getSeconds()<10? '0'+date.getSeconds(): date.getSeconds();
        
        return `${year}-${month}-${days} ${hours}:${minute}:${second}`;
    }
    
    //  get reverse datetime (default 60s)
    this.reverse = (date=new Date(), value=-60*1000) => {
        return new Date(date.getTime() + value);
    }

    this.delay = (ms=60*1000) => {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

    //  item = object data type
    this.update = async(item) => {
        let url = `https://${this.shop_domain}/api/3.0/products/${item.product_id}/variants.json`;
        let json = { variants: [item] };
        let data = JSON.stringify(json, null, 2);

        const config = {
            method: 'put',
            url: url,
            headers: { 
                'EasyStore-Access-Token': this.access_token
            },
        
            data: data
        };

        let response = await axios(config);
        return response.data;
    }

    this.compare = async() => {
        /*
            Current Hash Table ("EasyStore_Hash")
        */
        let query_current = `
            select 
                [product_id], [id], [hash]
            from EasyStore_Hash
            where [changed_datetime] <= '${this.dateString(this.previous)}'
        `;
        this.conn.query(query_current)
            .then(result_current => {
                let rs_current = [...result_current.recordset];
                //  mapping object
                let map = {};

                for(let row of rs_current)
                    map[row['product_id']] = {id: row['id'], hash: row['hash'].toString()};

                /*
                    Generate Hash Table ("SP_HashTable" procedure)
                */
                let query_generate = `
                    exec SP_HashTable 'EasyStore_Stock', '[product_id], [id], [handle]', ''
                `;
                this.conn.query(query_generate)
                    .then(async (result_generate) => {
                        let rs_generate = [...result_generate.recordset];
                        let update_list = [];

                        for(let row of rs_generate){
                            //  need to convert row['product_id'] to string type, (obj[property], property = string type)
                            let obj = map[row['product_id'].toString()];
                            
                            //  check same [product_id] and [id], but [hash] not same
                            if(obj!=null && obj.id==row['id'] && obj.hash!=row['hash']){
                                update_list.push({ 
                                    product_id: row['product_id'],
                                    id: row['id'],
                                    hash: row['hash']
                                });
                            }
                        }
                        
                        //  output update items length
                        console.log(`[${this.dateString()}] Need to update items: ${update_list.length}`);
                        
                        for(let object of update_list){
                            //  able to select all, or just select needs columns
                            let query_information = `
                                select 
                                --    *
                                    [product_id], [id], [body_html], [weight], [height], 
                                    [price], [cost], [inventory_quantity]
                                from EasyStore_Stock 
                                where [product_id] = ${object.product_id} and [id] = ${object.id}
                            `;

                            /*
                                Sync Database (Stock) to "EasyStore"
                            */
                            try{
                                let response = await this.conn.query(query_information);
                                //  update stock item information to "EasyStore" product (quantity, price, cost etc)
                                let item = response.recordset[0];
                                this.update(item);

                            }catch(err){
                                console.error(err);
                                console.error('Fail update stock information to "EasyStore"');
                                console.error(`[product_id] = ${object.product_id}, [id] = ${object.id}`);
                            }

                            /*
                                Update "EasyStore_Hash" hash value
                            */
                            let pool = await mssql.connect(this.db_config);
                            let ps = new mssql.PreparedStatement(pool);

                            ps.input('hash_code', mssql.VarBinary, object.hash);
                            ps.prepare(`
                                update EasyStore_Hash
                                set [hash] = @hash_code, [changed_datetime] = getdate()
                                where [product_id] = ${object.product_id} and [id] = ${object.id}
                            `, (err)=>{
                                ps.execute({hash_code: object.hash}, (err, records)=>{
                                    ps.unprepare((err)=>{
                                        console.log(`Successful update "[product_id]: ${object.product_id}, [id]: ${object.id}" hash code.`);
                                    });
                                });
                            });
                            
                        }
                    })
                    .catch(err=>console.error(err));
            })
            .catch(err=>console.error(err));
    }

    this.loop = async(delay_ms=this.delay_ms) => {
        this.previous = this.timestamp;
        this.compare();
        console.log(`[${this.dateString()}] Complete sync data.`);

        await this.delay(this.delay_ms);
        this.timestamp = new Date();
        this.loop();
    }

    return this;
}

//	get ../Company.sys file connection setting
const getLocalConnection = (port=1433, filepath="../Company.sys") => {
	let file_str = fs.readFileSync(filepath, "utf-8").replace(/"/g, "");
	//	just get 1st line and split will the tab char
	let arr = file_str.split("\r")[0].split("	");
	//	Company.sys setting value position
	let property_index = {
		server: 5,
		user: 6,
		password: 4,
		database: 3
	}
	//	some default setting port and MSSQL options (node.js)
	let result = [{
		port: port,

		parseJSON: true,
        options:{
            trustedConnection: true,
            enableArithAbort: true,
            encrypt: false
        }
	}];
	
	for(let property in property_index)
		result[0][property] = arr[property_index[property]];
	return result;
}

let config_file = JSON.parse(fs.readFileSync("setting/config.json", "utf-8"), 4);
if(config_file.local_database)
	config_file.mssql = getLocalConnection(config_file.mssql_server_port);
else
	config_file.mssql = JSON.parse(fs.readFileSync("setting/multiple_database.json", "utf-8"), 4);

//  default delay 60s to looping
let delay = 60 * 1000;
let handle = new Handle(config_file, delay);
handle.loop();
