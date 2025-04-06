
// ANCIENT HISTORY
const ChildProcDBCom = require('../lib/client_com')


console.time("START-Table Sharing Child")


let cpdc = new ChildProcDBCom({
    "continue_as_standalone" : false
})


let topic = "admin"
let path = "test"
let message = "subscribing"
let handler = (in_message) => {
    console.log("Got admin message: ",in_message)
}
cpdc.subscribe(topic,path,message,handler)




console.timeLog("START-TEST","share_table_managemet: check 1")
