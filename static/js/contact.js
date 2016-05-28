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
				var span = $("<span></span>").html("Thank you for contacting us. We will get back to you as soon as possible.");
				$("#result > span").remove();
				span.appendTo($("#result"));
				$("#result").fadeIn();
				$("#contact-form").slideUp();
			}
			else
			{
				var span = $("<span></span>").html(res["error"]).css("color","red");
				$("#result > span").remove();
				span.appendTo($("#result"));
				$("#result").fadeIn();
			}
		}});
}
