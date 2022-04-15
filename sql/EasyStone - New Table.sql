
/*
	EasyStore_Hash - [hash] currently confirm use "HashBytes - MD5" enough, the column data type and size = binary(16)
		refer:
		https://dba.stackexchange.com/questions/191979/best-data-type-to-store-result-of-hashbytesmd5
*/

------------------------------------------------------------------------------------------------------------------------

create table EasyStore_Stock(
	--	PK (EasyStore API response)
	[product_id] int not null,
	[id] int not null,
	--	FK (Stock.[Stock Code])
	[name] varchar(50) default '',

	--	Other Information
	[handle] varchar(50) default '',
	[body_html] nvarchar(2000) default '',
	[weight] varchar(50) default '0',
	[height] varchar(50) default '0',

	[price] money default 0,
	[cost] money default 0,
	[inventory_quantity] decimal(18, 2) default 0,

	--	Set PK & FK
	constraint PK_EasyStore_Stock primary key ([product_id], [id]),
	constraint FK_EasyStore_Stock foreign key ([name]) references Stock([Stock Code]),
)

------------------------------------------------------------------------------------------------------------------------

create table EasyStore_Image(
	--	PK
	[url] varchar(256) not null,
	--	FK
	[product_id] int not null,
	[id] int not null,
	--	Other
	[position] tinyint,

	--	Set PK & FK
	constraint PK_EasyStore_Image primary key ([url]),
	constraint FK_EasyStore_Image foreign key([product_id], [id]) references EasyStore_Stock([product_id], [id])
)

------------------------------------------------------------------------------------------------------------------------

create table EasyStore_Hash(
	--	PK & FK
	[product_id] int not null,
	[id] int not null,
	--	Other
	[hash] varbinary(16) not null,
	[changed_datetime] datetime default getdate()

	--	Set PK & FK
	constraint PK_EasyStore_Hash primary key ([product_id], [id]),
	constraint FK_EasyStore_Hash foreign key([product_id], [id]) references EasyStore_Stock([product_id], [id])
)

------------------------------------------------------------------------------------------------------------------------

/*	For Testing or Debug

select * from EasyStore_Stock
select * from EasyStore_Image
select * from EasyStore_Hash

delete EasyStore_Image
delete EasyStore_Hash
delete EasyStore_Stock

drop table EasyStore_Hash
drop table EasyStore_Image
drop table EasyStore_Stock
*/
