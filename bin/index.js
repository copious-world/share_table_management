#!/usr/bin/env node

// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- 
const fs = require('fs')

let test_path = `${__dirname}/proc_js_table_pipe`

let default_conf = {
    //
    "table_sharing_class" : "../lib/node_types/table_sharing_node",
    "aging" : 1000,
    "age_window" : 1000000,
    "uds_path" : test_path,  // socket path
    "uds_path_count" : 4,
    //
    "parent_command_conf" : {
        "parent_com" : "message-relay-services", //  require("connect_module")  must have subscribe and unsubscrieb
        "class_choice" : "message_relayer",
        "parent_conf" : {
            "test" : "test"
        },
        "parent_response_handler" : "parent_response_handler",  // require("parent_response_handler") must have get_supplier_action(topic,path,this)
        "handler_conf" : {  // application specific
            "logging" : "log_event",
            "refresh" : "reload_data",
            "shutdown" : "kill_procs"
        },
        "accepted_topics" : [
            "logging",
            "refresh",
            "shutdown"
        ]
    }
}


let conf = default_conf
if ( process.argv.length > 2 ) {
    let conf_file = fs.readFileSync(process.argv[process.argv.length-1])
    if ( conf_file ) {
        conf = JSON.parse(conf_file.toString())
    }
} else {
    try {
        let conf_file = fs.readFileSync('shared-table.conf')
        if ( conf_file ) {
            conf = JSON.parse(conf_file.toString())
        }
    } catch (e) {
    }
}

let ManagerProc = false;
let sharing_module_package_name = conf.sharing_module
if ( sharing_module_package_name ) {
    const module = require(sharing_module_package_name)
    ManagerProc = module[conf.table_sharing_class]
} else {
    ManagerProc = !!(conf.table_sharing_class) ? require(conf.table_sharing_class) : require('../lib/node_types/table_sharing_node')
}



/*
    let ClientOfParent = require(conf.parent_command_conf.parent_com)
*/

if ( ManagerProc ) {
    let pjtm = new ManagerProc(conf)

    process.on('SIGINT', () => {
        pjtm.release_and_exit()
    })
} else {
    console.log("Manager proc")
}
