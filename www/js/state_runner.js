/*
 Execute student code from the "Code" tab of the main robot pilot interface

 Mike Moss & Orion Lawlor, 2015-08 (Public Domain)
*/

function state_runner_t()
{
	this.execution_interval=30; // milliseconds between runs
	
	this.state=null;
	this.continue_state=null;
	this.continue_timeout=null;
	this.state_list=[];
	this.kill=true;
	
	this.VM_power={};
	this.VM_sensors={};
}

state_runner_t.prototype.run=function(state_table)
{
	this.state=null;
	this.continue_state=null;
	this.continue_timeout=null;
	this.state_list=[];
	this.kill=false;

	if(!state_table)
		return;

	state_table.clear_prints();

	this.run_m(state_table);
}

state_runner_t.prototype.stop=function(state_table)
{
	console.log("stopping");
	this.kill=true;
	this.clear_continue_m();
	state_table.set_active();
}

// Look up this state in our state list, or return null if it's not listed
state_runner_t.prototype.find_state=function(state_name)
{
	for(var key in this.state_list)
	{
		var s=this.state_list[key];
		if(s && s.name==state_name) {
			return s;
		}
	}
	// else not found
	return null;
}

state_runner_t.prototype.run_m=function(state_table)
{
	this.state_list=state_table.get_states();

	if(this.state_list.length<=0)
	{
		console.log("no state_list");
		state_table.onstop_m();
		return;
	}

	if(this.state==null)
		this.state=this.state_list[0].name;

	var myself=this;
	setTimeout(function(){myself.execute_m(state_table);},this.execution_interval);
}

// Inner code execution driver: externally visible UI, and eval
//  Returns the virtual machine object used to wrap user code
state_runner_t.prototype.make_user_VM=function(code,states)
{
	var VM={}; // everything the user can access goes here

// Block access to all parent-created members:
	for(var key in this)
		VM[key]=undefined;

// Import each of their states
	for(var key in states)
		if(states[key])
			VM[states[key].name]=states[key].name;

// Import all needed I/O functionality
	VM.console=console;
	VM.printed_text="";
	VM.print=function(value) {
		VM.printed_text+=value+"\n";
		console.log(value+"\n");
	};
	VM.stop=function() { VM.state=null; }
	
	VM.sensors=this.VM_sensors;
	VM.power=this.VM_power;
	VM.robot={sensors:VM.sensors, power:VM.power};

// eval
	(new Function("with(this)\n{\n"+code+"\n}")).call(VM);
	return VM;
}

// Outer code execution driver: setup and error reporting
state_runner_t.prototype.execute_m=function(state_table)
{
	if(!this.kill)
	{
		state_table.clear_error();
		try
		{
			if(!this.state)
				throw("State is null.");

			var run_state=this.find_state(this.state);
			if(!run_state)
				throw("State \""+this.state+"\" not found!");

			console.log("running state "+this.state);
			state_table.set_active(this.state);

			this.update_continue_m(state_table,run_state);

			var VM=this.make_user_VM(run_state.code,this.state_list);
			
			state_table.show_prints(VM.printed_text,this.state);

			if(VM.state===null)
			{
				//user stopped
				state_table.onstop_m();
				return;
			}

			if(VM.state!==undefined) 
			{
				if(!this.find_state(VM.state))
					throw("Next state \""+VM.state+"\" not found!");
				
				this.clear_continue_m();
				this.state=VM.state;
			}

			var myself=this;
			setTimeout(function(){myself.execute_m(state_table);},this.execution_interval);
		}
		catch(error)
		{
			//stop with error
			state_table.show_error(error,this.state);
			console.log("Error! - "+error);
			state_table.onstop_m();
		}
	}
}

state_runner_t.prototype.continue_m=function(state_table)
{
	var found=false;
	this.continue_timeout=null;

	for(var key in this.state_list)
	{
		if(this.state_list[key])
		{
			if(this.state_list[key].name==this.state)
			{
				found=true;
			}
			else if(found)
			{
				this.state=this.state_list[key].name;
				break;
			}
		}
	}

	if(!found)
		state_table.onstop_m();
}

// State run time limiting
state_runner_t.prototype.update_continue_m=function(state_table,state)
{
	var state_time_int=parseInt(state.time,10);
	if(!this.continue_timeout&&state_time_int>0)
	{
		var myself=this;
		this.continue_timeout=setTimeout(function(){myself.continue_m(state_table);},
			state_time_int);
	}
}

state_runner_t.prototype.clear_continue_m=function()
{
	if(this.continue_timeout)
	{
		clearTimeout(this.continue_timeout);
		this.continue_timeout=null;
	}
}
