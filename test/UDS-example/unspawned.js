



if ( typeof process.send === 'function' ) {
    console.log("CAN SEND TO PARENT")
    process.send("this is a test")
} else {
    console.log("CAN'T SEND TO THE PARENT")
}