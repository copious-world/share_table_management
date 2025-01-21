

const ProcJSTableManager = require('../lib/node_types/table_sharing_node')


let conf = {
    "aging" : 1000,
    "age_window" : 1000000,
    "parent_command_conf" : {
        "parent_com" : {}, // this is a OS SOCKET
        "parent_response_handler" : {},
        "accepted_topics" : []
    }
}



let pjtm = new ProcJSTableManager(conf)
