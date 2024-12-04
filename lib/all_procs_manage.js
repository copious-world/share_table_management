
const ProcJSTableManager = require(`./node_types/table_sharing_node`)
// note:
// A ProcJSTableManager will keep tables in the process that constructs it.
// In that case, if th process is the copious-host-manager, the ProcJSTableManager will keep tables for 
// that process in the host manager, which will bloat the process. The ProcJSTableManager default is best
// used for testing. 

class AllProcsManager {

    constructor(g_proc_managers,node_type) {
        this._proc_managers = g_proc_managers
    }


    /**
     * #_read_node_class
     * 
     * Expect that a type of node will be requested by a configuration.
     * Find the type of node in the type directory if `node_type` field is not already an application provided class.
     * 
     * On failing to create a node, create a default type of node.
    */
    #_read_node_class(conf) {
        let NodeInterface = this.NodeInterface;
        if ( (conf !== undefined) && ( conf.node_type !== undefined) ) {
            if ( typeof conf.node_type !== 'string' ) {
                NodeInterface = conf.node_type;
            } else {
                NodeInterface = require(`./node_types/${conf.node_type}`)
            }
        } else {
            NodeInterface = ProcJSTableManager
        }
        return NodeInterface
    }


    /**
     * add_one_new_proc
     * 
     * Adds a new process to the table of managed processes if there is no entry for the proc name.
     * Spawns the process. And, this will update the configuration entry for later runs.
     * 
     * If the process being spawned is to be launched by a child of the calling process, the class of the grandchild process
     * should call upon a running child to launch it. The configuration, `proc` should include access to the child 
     * that launches the grandchild. The `spawn_child` method of the grandchild NodeInterface class
     * should be written to handle he relationships between the child and the grandchild.
     * 
     * Sibling child classes that communicate by a means known peculiar to them, should also provde a `spawn_child` method 
     * that knows how to introduce the communication links used by the siblngs. 
     * 
     * @param {*} proc - a descriptor of a proc, and also the configuration for it.
     * @param {*} proc_name - a table used by the manager to access the proc handle for process control
     * @param {*} conf - the configuration of the calling process that retain a list of proces known to it in the field, `all_procs`.
     * @returns boolean - true if the table of processes does not already have an entry 
     */
    add_one_new_proc(proc,proc_name,conf) {
        let NodeInterface = this.#_read_node_class(proc)
        //
        if ( _proc_managers[proc_name] === undefined ) {
            //
            let shared_mem_table = new NodeInterface(proc)
            shared_mem_table.spawn_child(proc)
            //
            _proc_managers[proc_name] = shared_mem_table
            if ( conf.all_procs[proc_name] === undefined ) {
                conf.all_procs[proc_name] = proc
            }
            //
            return true;
        } else {
            return false;
        }
    }
    
    /**
     * #_add_one_dormant_proc
     * 
     * A private method that adds a process descriptor to the configuration, but does not launch the process.
     * 
     * 
     * @param {*} proc - the configuration object passed to the constructor of the class object that manages a process.
     * @param {*} proc_name - the name of the process in the caller's configuration
     * @param {*} conf - the caller's configuration
     */
    #_add_one_dormant_proc(proc,proc_name,conf) {
        let NodeInterface = this.#_read_node_class(proc)
        //
        let shared_mem_table = new NodeInterface(proc)
        _proc_managers[proc_name] = shared_mem_table
        if ( conf.all_procs[proc_name] === undefined ) {
            conf.all_procs[proc_name] = proc
        }
    }
    
    /**
     * update_one_proc
     * 
     * Whether the process is running or not, this method changes the proc descriptor
     * and it passes on the proc configuration to running processes by a call to `set_conf`.
     * 
     * @param {*} proc 
     * @param {*} proc_name 
     * @param {*} conf 
     */
    update_one_proc(proc,proc_name,conf) {
        let shared_mem_table = _proc_managers[proc_name]
        if ( shared_mem_table && conf.all_procs[proc_name] ) {
            conf.all_procs[proc_name] = proc
            shared_mem_table.set_conf(proc)
        }
        if ( conf.all_procs[proc_name] === undefined ) {
            console.log("attempting to update a nonexistant proc")
            console.log(proc_name)
            console.dir(proc)
            console.dir(conf.all_procs)
        }
    }
    
    /**
     * remove_proc
     * 
     * Removes reference to a process descriptor from the application configuration's `all_procs` table
     * and it call upon the `stop_proc` method of the managing class.
     * 
     * @param {*} proc_name 
     * @param {*} conf 
     */
    remove_proc(proc_name,conf) {
        if ( conf.all_procs[proc_name] !== undefined ) {
            let proc_m = _proc_managers[proc_name]
            delete conf.all_procs[proc_name]
            delete _proc_managers[proc_name]
            proc_m.stop_proc()
        }
    }
    
    
    /**
     * initialize_dormant_children
     * 
     * Initializes all processes in the proc table unless `only_dormant` is set to true.
     * If `only_dormant` is set to true, then this method only initializes process that are not running.
     * 
     * @param {*} conf 
     * @param {*} only_dormant - if true, then only process that are not running will be initialized
     */
    initialize_dormant_children(conf,only_dormant = true) {
        only_dormant = (only_dormant === undefined) ? true : only_dormant
        let proc_list = conf.all_procs
        //
        for ( let proc_name in proc_list ) {
            let proc = proc_list[proc_name]
            if ( proc.run_on_start && !(only_dormant) ) {
                this.add_one_new_proc(proc,proc_name,conf)
            } else {
                this.#_add_one_dormant_proc(proc,proc_name,conf)
            }
        }
    }

    /**
     * initialize_children
     * 
     * Calls `initialize_dormant_children` with `only_dormant` set to false
     * 
     * @param {*} conf 
     */
    initialize_children(conf) {
        this.initialize_dormant_children(conf,false)
    }
    

}



module.exports = AllProcsManager;