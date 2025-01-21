# shared-table-types
 
This module is a library for utlitizing an outline for managing processes that share tables each requiring a selection of a communication option.


## install


For use as a module providing classes.

```
npm install -s shared-table-types
```


For use as a command line deamon launcher


```
npm install -g shared-table-types
```

After this, install a config, `stt.conf`, in the working directory.

Then run:

```
shared-table-types 
```

This command launches a table deamon configured to use a flavor of shared table. Depending on the configuration, applications will use one of the clients designed to use the type of table hosted by the deamon.

## Best uses

The best use may be to embed the server in a process built of the application. Clients fitting the configuration of the classes used in the emedded server may be the same as those used in the default deamon. Server classes are provided to make this embedding. 

## Current state of module

At the moment, this module implements a very simple JavaScript table that can be used for applications requiring a session table. See for instance, `session_tokens` a module used by `copious-transitions`, the state transition tracking web server framework.

Successive versions may use shared memory implementations and may be swapped with older versions by changing configurations.

## Next

...










