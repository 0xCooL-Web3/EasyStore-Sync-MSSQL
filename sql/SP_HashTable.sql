
/*
	refer:
		https://www.codeproject.com/Questions/1085589/How-to-store-data-from-exec-sp-executesql-query-in
*/

----------------------------------------------------------------------------------------------------

alter procedure SP_HashTable (
	@table_name varchar(256),
	@pk_columns varchar(max),
	@mix_columns varchar(max)
)
as
begin
	--	@single_quote = '
	declare @single_quote char(1) = char(39);
	declare @sql nvarchar(max);

	if @mix_columns <> ''
	begin
		set @sql = N'
			--	string of before convert to hash value
			declare @mixed_string varchar(max);

			with
			hash_column as (
				select
					' + @single_quote + 'cast(isnull(' + @single_quote + '+[Item]+' + @single_quote + ', 0) as varchar)'+ @single_quote +' as [column_name]
				from SplitStrings(' + @single_quote + @mix_columns + @single_quote + ', ' + @single_quote + ', ' + @single_quote + ')
			) 
		';
	end;
	--	select all columns without @pk_columns
	else
	begin
		set @sql = N'
			--	string of before convert to hash value
			declare @mixed_string varchar(max);

			with
			table_column as (
				select
					replace(replace([Item], ' + @single_quote + '[' + @single_quote + ', ' + @single_quote + @single_quote + '), ' + @single_quote +']' + @single_quote + ', ' + @single_quote + @single_quote + ') as [column_name]
				from SplitStrings(' + @single_quote + @pk_columns + @single_quote + ', ' + @single_quote + ', ' + @single_quote + ')
			), 
			hash_column as (
				select
					' + @single_quote + 'cast(isnull([' + @single_quote + '+[name]+' + @single_quote + '], 0) as varchar)' + @single_quote + ' as [column_name]
				from sys.all_columns
				where 
					object_id = object_id(' + @single_quote + @table_name + @single_quote + ') and
					[name] not in (
						select [column_name] from table_column
					)
			) 
		';
	end;

	--	combine condition query and convert all data type to string
	set @sql = @sql + N'
		select @mixed_string = coalesce(@mixed_string + '+@single_quote+'+'+@single_quote+', '+@single_quote+@single_quote+') + [column_name] from hash_column
		select @mixed_string
	';
	create table #temp(mix_string nvarchar(max))
	insert into #temp
	exec sp_executesql @sql

	--	Build Hash Table
	set @sql = N'
		select
			'+@pk_columns+', HashBytes('+@single_quote+'MD5'+@single_quote+', '+(select [mix_string] from #temp)+') as [hash]
		from ' + @table_name + '
	';

	--	for debug use
	print(@sql)

	exec sp_executesql @sql
	drop table #temp
end
return

----------------------------------------------------------------------------------------------------

/*	
	[Testing]

	exec SP_HashTable 'EasyStore_Stock', '[product_id], [id], [handle]', ''
	exec SP_HashTable 'Stock', '[Stock Code]', '[Description], [Price I]'
*/
