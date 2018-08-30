function showLoad()
{
	$(".loading_logo_hide").show();
}

function submitForm()
{
	$.ajax({
		type: "POST",
		url: "/api/contact",
		data: $('#contact-form').serialize(),
		beforeSend:function(){return;},
		success: function(res, status, xhr)
		{
			if(res["success"])
			{
				var div = $("<div></div>").attr({"class": "alert alert-success"}).html("Thank you for contacting us. We will get back to you as soon as possible.");
				$("#result_contact > div").remove();
				div.appendTo($("#result_contact"));
				$("#result_contact").fadeIn();
				$("#contact-form").slideUp();
			}
			else
			{
				var div = $("<div></div>").attr({"class": "alert alert-danger"}).html(res["error"])
				$("#result_contact > div").remove();
				div.appendTo($("#result_contact"));
				$("#result_contact").fadeIn();
			}
		}});
}
