var spawn = require('child_process').spawn,
    path = require('path'),
    sockets;

exports.set_sockets = function(sock) {
  sockets = sock;
};

exports.execute_program = function(file, is_job) {
  
  console.log(file);
  if (file.extension === 'py') {
    execute_program(file, "sudo python", is_job);
  } else if (file.extension === 'rb') {
    execute_program(file, "sudo ruby", is_job);
  } else if (file.extension === 'js') {
    execute_program(file, "sudo node", is_job);
  }
};

function get_socket(username, cb) {
  for (var socketId in sockets) {
    sockets[socketId].get('username', function(err, sock_username) {
      if (username === sock_username) {
        cb(sockets[socketId]);
      }
    });
  }
}

function execute_program(file, type, is_job) {
  var file_path = path.resolve(__dirname + "/../" + file.path.replace('\/filesystem\/', '\/repositories\/'));

  console.log('execute_program');

  get_socket(file.username, function(socket) {
    var prog = spawn(type, [file_path]);
    if (socket) {
      handle_output(prog, file, is_job, socket);
    }
  });
}

function handle_output(prog, file, is_job, socket) {
  if (is_job) {
    socket.emit('scheduler-start', {file: file});
  }

  prog.stdout.on('data', function(data) {
    if (is_job) {
      socket.emit('scheduler-executing', {file: file});
    } else {
      socket.emit('program-stdout', {output: data.toString()});      
    }
  });

  prog.stderr.on('data', function(data) {
    if (is_job) {
      socket.emit('scheduler-error', {file: file, error: data}); 
    } else {
      socket.emit('program-stderr', {output: data.toString()});
    }
  });

  prog.on('exit', function(code) {
    if (is_job) {
      socket.emit('scheduler-exit', {code: code});
    } else {
      socket.emit('program-exit', {code: code});      
    }

  });    
}