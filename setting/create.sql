
select 
	Stock.[Stock Code] as [title], 
	Stock.[Description] as [description], Stock.[Description] as [body_html], 
	--	Images (default EasyStore receive 3 images)
	img.[Picture 1] as [image1], img.[Picture 2] as [image2], img.[Picture 3] as [image3], 
	--	Variants
	Stock.[Weight] as [weight], Stock.[Height] as [height], 
    isnull(Stock.[Price I], 0) as [price], isnull(Stock.[Last Receive Cost], 0) as [cost_price], 
    isnull(Stock.[Last Receive Qty], 0) as [inventory_quantity], 

	--	EasyStore Setting
	'easystore' as [inventory_management], 1 as [is_enabled]
from Stock
inner join Stock_ImageOnline img on img.[Stock Code] = Stock.[Stock Code]
