const {spawn} = require('child_process');


function spawn_child(proc_name,error_consumer = console.log,ouput_consumer = console.log,more_parameters = false) {
    let cproc = false
    if ( Array.isArray(proc_name) ) {
        let proc = proc_name.shift()
        if ( more_parameters ) {
            if ( Array.isArray(more_parameters) ) {
                proc_name.concat(proc_name)
            } else {
                proc_name.push(more_parameters)
            }
        }
        cproc = spawn(proc,proc_name,{ "stdio" : ["pipe","pipe","pipe","ipc"]})
    } else {
        if ( more_parameters ) {
            let pars = [proc_name]
            if ( Array.isArray(more_parameters) ) {
                proc_name = pars.concat(more_parameters)
            } else {
                pars.push(more_parameters)
            }
        }
        cproc = spawn('node',pars,{ "stdio" : ["pipe","pipe","pipe","ipc"]})
    }
    if ( cproc ) {
        cproc.stderr.on('data',(data) => {
            error_consumer(data.toString())
        })
        cproc.stdout.on('data',(data) => {
            ouput_consumer(data.toString())
        })    
    }
    return cproc
}


module.exports.spawn_child = spawn_child


