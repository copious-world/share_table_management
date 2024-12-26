

console.time("START-TEST")
const ProcJSTableManager = require('../lib/node_types/table_sharing_node')

const ChildProcDBComInterface = require('../lib/client_com')

const {
    Worker,
    isMainThread,
    workerData,
    setEnvironmentData,
    getEnvironmentData,
    parentPort
} = require('node:worker_threads');


//
async function testf() {

    if ( isMainThread ) {

        let test_path = `${__dirname}/my_test_pipe`
        let conf = {
            "uds_path" : test_path,
            "uds_path_count" : 4,
            "aging" : 10000
        }
        //
        let epoint = new ProcJSTableManager(conf)

        // SIGINT is a test --
        process.on('SIGINT',(signal) => {
            epoint.app_publish_on_path("admin","mem-table",{
                "shutdown" : true
            })
            console.log("shutting down all connections and exiting process")
            epoint.release_and_exit()
            process.exit(0)
        })


        let all_workers = []
        let all_promises = []

        let n = conf.uds_path_count
        for ( let i = 0; i < n; i++ ) {
            //
            const worker = new Worker(__filename,{
                workerData : { "worker_index" : i }
            });
            all_workers.push(worker)
            //
            let p = new Promise((resolve,reject) => {
                worker.once('message', (message) => {
                    console.dir(message);  // Prints 'Hello, world!'.
                    resolve(true)
                });
            })
            //
            all_promises.push(p)
            //
        }
        //
        console.log("Waiting for a worker")
        await Promise.all(all_promises)

        console.log("handling message from children")

    } else {
        //
        let index = workerData.worker_index
        //
        let test_path = `${__dirname}/my_test_pipe-${index}`
        let conf = {
            "in_mem_table_connect" : {
                "uds_path" : test_path,
                "uds_path_count" : 0    
            }
        }
        //
        let db_client = new ChildProcDBComInterface(conf)
        await db_client.ready()

        let randoms = []

        for ( let i = 0; i < 100; i++ ) {
            randoms[i] = Math.random()*10000
            //console.log(`This is a ${i} test  ... ${randoms[i]}`)
            await db_client.set(randoms[i],`This is a ${i} test`)
        }

        for ( let i = 0; i < 100; i++ ) {
            let value = await db_client.get(randoms[i])
            console.log(`got a value of ${value} from hash: ${randoms[i]}`)
        }

        parentPort.postMessage(`ran test ${test_path}`);

        //
    } 

}

testf()

