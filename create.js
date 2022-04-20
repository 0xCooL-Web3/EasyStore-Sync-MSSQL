 /*
	refer API: https://documenter.getpostman.com/view/8990390/TzRYc4mn#0bc37452-2fb7-4425-bbea-495508c7fef0
	(3.0 → Product → [POST]Creates a new product)

	refer handle error (learning, rarely used):
		https://itnext.io/error-handling-with-async-await-in-js-26c3f20bc06a
		https://gist.github.com/SegersIan/01348d90ccae93c20031dba93195e582#file-error_handle_async_try_catch-js

	refer node.js Buffer(binary) insert into MSSQL database:
		https://stackoverflow.com/questions/34383938/how-to-insert-binary-data-into-sql-server-using-node-mssql
		https://stackoverflow.com/questions/55690245/this-parent-acquire-is-not-a-function-on-prepared-statements
		https://tediousjs.github.io/node-mssql/#connection-pools

	----------------------------------------------------------------------------------------------------

			Todolist
	[√] response data insert into "EasyStore_Stock"
	[√] upload image
	[√] response data insert into "EasyStore_Image"
	[√] re-build query with PK and FK
	[√] build hash table
	[√] insert Buffer(binary) into MSSQL database
	[√] change create query to .sql file
	[√] draw flow chart
 	[√] after upload image and create, delete it (reduce usage amount)
	
	[] add variable "this.hash_list" store the list
	[] change "SP_HashTable" to use "HashValue" to generate
	
			Future
	[] set all await got catch error handle

	----------------------------------------------------------------------------------------------------
*/
const ImageKit = require("imagekit");
const Conn = require("./class/conn");
const mssql = require("mssql");
const axios = require('axios');
const fs = require('fs');


function Handle(config={}, sql=""){
    //	ImageKit SDK setup
    this.imagekit = new ImageKit(config.imagekit);

	//	EasyStore API
	this.shop_domain = fs.readFileSync('setting/shop_domain.txt');
	this.access_token = fs.readFileSync('setting/access_token.txt');

    //	new MSSQL Conneciton
    this.conn = new Conn(config.mssql[0]);
	this.db_config = config.mssql[0];
    this.database = config.mssql[0].database;
    this.sql = sql;
	
	this.imageUpload = (data, filename) => {
		return new Promise((resolve, reject)=>{
			this.imagekit.upload({
				file: data,
				fileName: filename,
				folder: this.database
			}, (err, response)=>{
				if(err) reject(err);
				
				resolve(response);
			});
		});
	}

	this.imageDelete = (id) => {
		return new Promise((resolve, reject)=>{
			this.imagekit.deleteFile(id, (err, response)=>{
				if(err) reject(err);
				
				resolve(response);
			});
		});
	}

	this.create = async(json) => {
		let url = `https://${this.shop_domain}/api/3.0/products.json`;
		let data = JSON.stringify(json, null, 2);
		const config = {
			method: 'post',
			url: url,
			headers: { 
				'EasyStore-Access-Token': this.access_token
			},
		
			data: data
		};

		let response = await axios(config);
		return response.data;
	}

	//	insert response data into database table("EasyStore_Stock", "EasyStore_Image")
	this.insert = async(json) => {
		/*
			insert into "EasyStore_Stock"
		*/
		try{
			//	[product_id], [id], [name], [handle], [body_html], 
			//	[weight], [height], [price], [cost], [inventory_quantity]
			let query = `
				insert into EasyStore_Stock
				select 
					${json.id}, ${json.variants[0].id}, '${json.name}', '${json.handle}', '${json.body_html}', 
					'${json.variants[0].weight? json.variants[0].weight: ''}', '${json.variants[0].height? json.variants[0].height: ''}', 
					${json.variants[0].price}, ${json.variants[0].cost_price}, ${json.variants[0].inventory_quantity}
			`;

			let response = await this.conn.query(query);
			//	1 = execute successful
			// console.log(response.rowsAffected);
		}
		catch(err){
			console.error(err);
		}
		
		/*
			insert into "EasyStore_Image"
		*/
		try{
			//	for loop all images (able to upload more than one images)
			for(let image of json.images){
				//	[url], [product_id], [id], [position]
				let query = `
					insert into EasyStore_Image
					select
						'${image.url}', ${image.product_id}, ${json.variants[0].id}, ${image.position}
				`;

				let response = await this.conn.query(query);
				//	1 = execute successful
				// console.log(response.rowsAffected);
			}
		}
		catch(err){
			console.error(err);
		}

		/*
			insert into "EasyStore_Hash"
		*/
		try{
			//	return - [product_id], [id], [handle], [hash]
			let query = `
				exec SP_HashTable 'EasyStore_Stock', '[product_id], [id], [handle]', ''
			`;

			let response = await this.conn.query(query);
			let rs = response.recordset;
			let hash = null;

			//	get hash code (found current “[product_id], [id]” in the HashTable)
			for(let row of rs)
				if(row['product_id']==json.id && row['id']==json.variants[0].id){
					hash = row['hash'];
					break;
				}
			
			if(hash!=null){
				mssql.connect(this.db_config).then((pool) => {
					let ps = new mssql.PreparedStatement(pool);

					ps.input('hash_code', mssql.VarBinary, hash);
					ps.prepare(`
						insert into EasyStore_Hash([product_id], [id], [hash])
						values(
							${json.id}, ${json.variants[0].id}, @hash_code
						)
					`, (err)=>{
						ps.execute({hash_code: hash}, (err, records)=>{
							ps.unprepare((err)=>{
								console.log(`Successful insert "${json.name}" hash code.`);
							});
						});
					});
				})
				.catch(err=>console.error(err));
			}
			else
				console.error(`Unable to generate hash code.`);
		}
		catch(err){
			console.error(err);
		}
	}

    this.build = () => {
        if(this.sql=="") throw "SQL Query was empty!";
		let sql = this.sql;
		
		this.conn.query(sql)
			.then(async (result)=>{
                //	mssql recordset
				let rs = result.recordset;
				let properties = ["title", "description", "body_html", "weight", "height", "price", "cost_price", "inventory_quantity", "is_enabled"];
				let images = ["image1", "image2", "image3", "image4"];
				//	variants properties
				let variants = ["weight", "height", "price", "cost_price", "inventory_quantity", "is_enabled"];

				for(let row of rs){
					//	default properties(create product data), track inventory, images and one variants
					let obj = {
						inventory_management: 'easystore',
						images: [],
						variants: [{}]
					};

					for(let property of properties)
						if(variants.includes(property))
							obj.variants[0][property] = row[property];
						else
							obj[property] = row[property];

					/*	
						[if exist image binary data]

						- convert to base64
						- generate url(using "ImageKit API"), push to obj.images
						- push to arr_image_id "ImageKit ID" (after upload, delete require)
					*/
					let arr_image_id = [];
					for(let image of images)
						// if(image!=null || image!=""){
						if(row[image]!=null){
							let filename = `${row['title'] || "Product"}.jpg`;
							let base64 = row[image].toString("base64");

							console.log(`Uploading "${row['title']}" to ImageKit(cloud)`);

							let response = await this.imageUpload(base64, filename);
							obj.images.push({"url": response.url});
							arr_image_id.push(response.fileId);
						}
					//	response(product information)
					let response = await this.create(obj);

					//	after created product(EasyStore) delete the image on the "ImageKit", to reduce storage
					for(let id of arr_image_id)
						this.imageDelete(id);
					
					try{
						//	put response data into database
						this.insert(response.product);
					}
					catch(err){
						// console.error(err);
						console.error(`Unable to insert all data.\nStoc Code: "${row['title']}"`);
					}
				}

				console.log(`Created all data.`);
            })
            .catch(err=>console.error(err));
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
let sql = fs.readFileSync("setting/create.sql", "utf-8");

if(config_file.local_database)
	config_file.mssql = getLocalConnection(config_file.mssql_server_port);
else
	config_file.mssql = JSON.parse(fs.readFileSync("setting/multiple_database.json", "utf-8"), 4);

let handle = new Handle(config_file, sql);
handle.build();
