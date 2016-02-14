/**
  List schools and robot names from superstar in
  a drop-down menu for the user to select.

  on_message(message) - Callback called when something should be added to a log.
  on_selected(robot) - Callback called when a valid school and robot combination is chosen.
*/

function name_t(div,on_message,on_selected)
{
	if(!div)
		return null;

	this.div=div;
	this.el=new_div(this.div);

	this.on_message=on_message;
	this.on_selected=on_selected;
	this.on_loaded_school=null;
	this.on_loaded_robot=null;
	this.disabled=false;

	var _this=this;

	//this.superstar="127.0.0.1:8081";
	this.superstar="robotmoose.com";

	this.school=document.createElement("select");
	this.el.appendChild(this.school);
	this.school.style.width="128px";
	this.school.onchange=function(){_this.download_robots_m();};

	this.robot=document.createElement("select");
	this.el.appendChild(this.robot);
	this.robot.style.width="128px";
	this.robot.onchange=function(){_this.on_selected_m();};

	/*this.superstar_select=document.createElement("select");
	var superstar_options=new Object();
	var superstar_options=[{"UAF main":"robotmoose.com"},
						   {"UAF test":"test.robotmoose.com"},
						   {"Local":"127.0.0.1:8081"}
	];
	this.build_select_m(this.superstar_select,superstar_options,"Superstar",function(){ console.log(_this.school.options[this.school.selectedIndex].text);});
	/*for(index in superstar_options){
		this.superstar_select[superstar_select.options.length]=new Object(superstar_options[index], index);
	}*/

	//this.el.appendChild(this.superstar_select);
	/*this.superstar_main=document.createElement("option");
	this.superstar_main.value="robotmoose.com";
	this.superstar_select.style.width="128px";
	this.superstar_select.appendChild(this.superstar_main);*/

	setInterval(function(){
						_this.on_loaded_school=_this.school.options[_this.school.selectedIndex].text; // Save old selected school
						_this.on_loaded_robot=_this.robot.options[_this.robot.selectedIndex].text; // Save old selected robot
						_this.download_schools_m();},
						1000);
	
	this.build_schools_m();
	this.build_robots_m();
	
	this.disables_interval=setInterval(function(){_this.update_disables_m();},100);
}

name_t.prototype.destroy=function()
{
	clearInterval(this.disables_interval);
	this.div.removeChild(this.el);
}

name_t.prototype.get_robot=function()
{
	var robot={superstar:this.superstar,school:null,name:null};

	if(this.school.selectedIndex>0&&this.robot.selectedIndex>0)
	{
		robot.school=this.school.options[this.school.selectedIndex].text;
		robot.name=this.robot.options[this.robot.selectedIndex].text;
	}

	return robot;
}




name_t.prototype.build_select_m=function(select,json,heading,on_loaded_value)
{
	select.length=0;

	var heading_option=document.createElement("option");
	select.appendChild(heading_option);
	heading_option.text=heading;

	for(var key in json)
	{
		var option=document.createElement("option");
		select.appendChild(option);
		option.text=json[key];

		if(json[key]==on_loaded_value)
		{
			select.value=on_loaded_value;
			select.onchange();
		}
	}

	this.update_disables_m();
}

name_t.prototype.build_schools_m=function(json)
{
	this.build_select_m(this.school,json,"School",this.on_loaded_school);
	this.download_robots_m();
}

name_t.prototype.build_robots_m=function(json)
{
	this.build_select_m(this.robot,json,"Robot",this.on_loaded_robot);
}

name_t.prototype.on_error_m=function(error)
{
	if(this.on_message)
		this.on_message(error);
}

name_t.prototype.download_schools_m=function()
{
	var _this=this;
	superstar_sub({superstar:this.superstar,school:"",name:""},"/",
		function(json){_this.build_schools_m(json); ;},
		function(error){_this.on_error_m("School download error ("+error+").");});
}

name_t.prototype.download_robots_m=function()
{
	if(this.school.selectedIndex<=0)
	{
		this.build_robots_m();
		return;
	}
	

	var selected_school=this.school.options[this.school.selectedIndex].text;

	if(selected_school)
	{
		var _this=this;

		superstar_sub({superstar:this.superstar,school:selected_school,name:""},"/",
			function(json){_this.build_robots_m(json);},
			function(error){_this.on_error_m("Robots download error ("+error+").");});
	}
}

name_t.prototype.update_disables_m=function()
{
	var disabled=false;
	if(this.school.selectedIndex<=0||this.disabled)
		disabled=true;
	this.robot.disabled=disabled;

	this.school.disabled=this.disabled;
}

name_t.prototype.on_selected_m=function()
{
	var robot=this.get_robot();

	if(this.on_selected&&robot.school!=null&&robot.name!=null)
		this.on_selected(robot);
}
