# EasyStore-Sync-MSSQL

### Used API:
- EasyStore
https://documenter.getpostman.com/view/8990390/TzRYc4mn#0bc37452-2fb7-4425-bbea-495508c7fef0
- ImageKit
https://docs.imagekit.io/api-reference/upload-file-api/server-side-file-upload#examples

### Requirement:
- Installed nodeJS or node.exe exist in root folder
- Run SQL query script ("EasyStone - New Table.sql" and "SP_HashTable.sql") in "sql" folder
- Authorize permission for access store (generate "shop_domain.txt" and "access_token.txt") in "setting" folder
- Custom setting config file or multiple_database in "setting" folder

### Custom Setting:
- imagekit: "publicKey", "privateKey", "urlEndpoint"
- local_database: true | false

### UML Diagram:
- create by https://draw.io/ 
- "Entity Relationship Diagram" and "Flow Chart" in "uml" folder
