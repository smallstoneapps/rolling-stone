var async = require('async');
var djb2 = require('djb2');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var Struct = require('struct');
var Table = require('cli-table');
var walk = require('walk');

module.exports = (function () {

  return {
    init: init,
    extract: extract,
    build: build,
    list: list
  };


  function init(argv) {
  }

  function extract(argv) {
    getSourceFiles(function (err, files) {
      getStrings(files, function (err, strings) {
        mkdirp('locale', function (err) {
          fs.writeFile('locale/strings.json', JSON.stringify(strings, null, 2), function (err) {
            console.log(err);
          });
        });
      });
    });
  }

  function build(argv) {
    fs.readFile('locale/strings.json', function (err, contents) {
      var strings = JSON.parse(contents);
      var data = new Buffer();
      strings.forEach(function (string) {
      });
      mkdirp('resources/locales', function (err) {
        fs.writeFile('resources/locales/english.bin', data, function (err) {
          console.log(err);
        });
      });
    });
  }

  function list(argv) {
    getSourceFiles(function (err, files) {
      getStrings(files, function (err, strings) {
        strings.sort(function (s1, s2) {
          if (s1.files.length < s2.files.length) {
            return 1;
          }
          if (s1.files.length > s2.files.length) {
            return -1;
          }
          if (s1.str.toLowerCase() < s2.str.toLowerCase()) {
            return -1;
          }
          if (s1.str.toLowerCase() > s2.str.toLowerCase()) {
            return 1;
          }
          return 0;
        });
        var table = new Table({
            head: ['String', '#']
          , colWidths: [60, 5]
          , chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
         , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
         , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
         , 'right': '' , 'right-mid': '' , 'middle': ' ' },
        style: { 'padding-left': 0, 'padding-right': 0 }
        });
        strings.forEach(function (str) {
          table.push([ str.str, str.files.length ]);
        });
        console.log(table.toString());
      });
    });
  }

  // ---

  function getSourceFiles(callback) {
    walker = walk.walk('src', { followLinks: true });
    var sourceFiles = []
    walker.on("file", function (root, fileStats, next) {
      var ext = path.extname(fileStats.name);
      if (ext === '.c') {
        sourceFiles.push(path.join(root, fileStats.name));
      }
      next();
    });
    walker.on("end", function () {
      return callback(null, sourceFiles);
    });
  }

  function getStrings(files, callback) {
    var localeRegex = new RegExp(/_\("([^\)]*)"\)/g);
    var strings = [];
    async.eachSeries(files, function (file, callback) {
      fs.readFile(file, function (err, contents) {
        if (err) {
          return callback(err);
        }
        var match = null;
        while (match = localeRegex.exec(contents.toString())) {
          var string = match[1];
          var strObj = getString(string);
          if (! strObj) {
            strObj = {
              str: string,
              files: [],
              hash: djb2(string) & 0x7FFFFFFF
            };
            strings.push(strObj);
          }
          strObj.files.push({
            filename: file,
            lineNumber: 0
          });
        }
        return callback();
      });
    },
    function (err) {
      return callback(err, strings);
    });

    function getString(str) {
      for (var s = 0; s < strings.length; s += 1) {
        if (strings[s].str === str) {
          return strings[s];
        }
      }
      return null;
    }
  }

}());