
----------------------------------------------------------------------------------------------------

alter function HashValue(@str varchar(max))
returns varbinary(16)
as
begin
	declare @hash varbinary(16) = HashBytes('MD5', @str);

	return @hash
end;

----------------------------------------------------------------------------------------------------

/*	
	[Testing]
	
	select dbo.Get_HashValue('test')

	select
		[Stock Code], [Description], dbo.Get_HashValue([Stock Code]+[Description]+cast([Price I] as varchar)) as [Hash Code]
	from Stock
*/
