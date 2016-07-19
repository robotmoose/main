//Mike Moss
//07/10/2016
//Contains the actual superstar server (mainly the http server portion).

#include <fstream>
#include <iostream>
#include "json_util.hpp"
#include "jsonrpc.hpp"
#include <mongoose/mongoose.h>
#include <stdexcept>
#include <string>
#include "string_util.hpp"
#include "superstar.hpp"
#include "time_util.hpp"
#include "web_util.hpp"

//Server options...needs to be global/non-local.
mg_serve_http_opts server_options;

//"Database".
superstar_t superstar("auth","db.json");

//Post log.
std::string post_log_name("superstar.log");
std::ofstream post_log(post_log_name.c_str());

//Backup save time variabels...
const int64_t backup_time=20000;
int64_t old_time=millis();

//Helper to send a message to conn with given status and content.
// Note, status should be in the form "200 OK" or "401 Unauthorized".
void mg_send(mg_connection* conn,const std::string& status,const std::string& content)
{
	mg_printf(conn,
		"HTTP/1.1 %s\r\n"
		"Content-Type: text/html\r\n"
		"Content-Length: %ld\r\n"
		"\r\n"
		"%s",
		status.c_str(),content.size(),content.c_str());
}

void http_handler(mg_connection* conn,int event,void* event_data)
{
	//Giant paranoia try/catch...
	try
	{
		//We really only care about HTTP requests.
		if(event==MG_EV_HTTP_REQUEST)
		{
			http_message* msg=(http_message*)event_data;
			if(msg==NULL)
				return;

			//Get client IP address (Apache messes this up...).
			char client_raw[200];
			mg_sock_to_str(conn->sock,client_raw,200,MG_SOCK_STRINGIFY_IP);
			std::string client(client_raw);

			//Extract the stuff we care about.
			std::string method(msg->method.p,msg->method.len);
			std::string request(msg->uri.p,msg->uri.len);
			std::string query(msg->query_string.p,msg->query_string.len);
			std::string post_data(msg->body.p,msg->body.len);

			//Print out everything.
			std::cout<<"Connection: "<<client<<" "<<method<<" "<<request;
			if(query.size()>0)
				std::cout<<"?"<<query;
			std::cout<<std::endl;

			//Log Post into a file.
			//  One JSON object per line, containing:
			//  {
			//      "time":TIME_MS_SINCE_LINUX_EPOCH,
			//      "client":STR_IP_ADDRESS,
			//      "data":STR_URL_ENCODED_DATA
			//  }
			if(method=="POST")
			{
				Json::Value entry;
				entry["time"]=Json::Int64(millis());
				entry["client"]=client;
				entry["data"]=url_encode(post_data);
				post_log<<JSON_serialize(entry)<<std::endl;
			}

			//Get requests...
			if(method=="GET")
			{
				//Starting "/superstar/" means a database query.
				if(starts_with(strip_end(request,"/"),"/superstar"))
				{
					request=request.substr(10,request.size()-10);
					mg_send(conn,"200 OK",JSON_serialize(superstar.get(request)));
				}

				//Otherwise it's a document...
				else
				{
					mg_serve_http(conn,msg,server_options);
				}
			}

			//Posts are setting, so JSON RPC actions...
			else if(method=="POST")
			{
				mg_send(conn,"200 OK",jsonrpc(superstar,post_data));
			}

			//Everything else is not allowed...
			else
			{
				mg_send(conn,"405 Method Not Allowed","");
			}
		}
	}
	catch(std::exception& error)
	{
		std::cout<<"Request error: "<<error.what()<<std::endl;
		mg_send(conn,"400 Bad Request","");
	}
	catch(...)
	{
		std::cout<<"Request error: Unknown exception."<<std::endl;
		mg_send(conn,"400 Bad Request","");
	}
}

int main()
{
	try
	{
		//Try to load database...
		if(superstar.load())
			std::cout<<"Loaded backup database."<<std::endl;
		else
			std::cout<<"No backup database found."<<std::endl;

		if(!post_log)
			throw std::runtime_error("Could not open log file \""+post_log_name+"\"!");

		//Server settings.
		std::string port("8081");
		server_options.document_root="../www";
		server_options.enable_directory_listing="no";
		server_options.ssi_pattern="**.html$";

		//Create server.
		mg_mgr manager;
		mg_mgr_init(&manager,NULL);
		mg_connection* server_conn=mg_bind(&manager,port.c_str(),http_handler);
		if(server_conn==NULL)
			throw std::runtime_error("Could not bind to port "+port+".");
		mg_set_protocol_http_websocket(server_conn);

		//Serve...forever...
		std::cout<<"Superstar started on "<<port<<":"<<std::endl;
		while(true)
		{
			mg_mgr_poll(&manager,500);

			//Try to save database...
			int64_t new_time=millis();
			if((new_time-old_time)>=backup_time)
			{
				if(superstar.save())
					std::cout<<"Saved backup database."<<std::endl;
				else
					std::cout<<"Could not save backup database."<<std::endl;
				old_time=new_time;
			}

		}
		mg_mgr_free(&manager);
	}
	catch(std::exception& error)
	{
		std::cout<<"Error: "<<error.what()<<std::endl;
		return 1;
	}
	catch(...)
	{
		std::cout<<"Error: Unknown exception."<<std::endl;
		return 1;
	}

	return 0;
}