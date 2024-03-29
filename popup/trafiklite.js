var stockfish;
var board;
var wait_for_calc = 'no';
var position_in_queue = 'no';
var position = '';
var engineready = 'no';
var pr = 0;
var lastpos = "";
var calculating = 'no';
var turn = '';
var orient = 'white';
$.ajaxSetup({
    cache: !1
});

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 10; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

function newpos(fen) {
    calculating = 'yes';
    $('#chess').empty();
    $('#chess').append('Calculating<br><progress id="progBar" value="2" max="100">');
    lastpos = fen;
    $('#overlay').empty();
    stockfish.postMessage("ucinewgame");
    position = fen;
    position_in_queue = 'yes';
    stockfish.postMessage("isready");
    stockfish.postMessage("position fen " + fen);
    console.log(orient + '**' + fen);
    ChessBoard('board', {
        position: fen,
        orientation: orient
    });
    stockfish.postMessage("go depth 16")
}

function fenfrommoves(txt) {
    console.log(txt);
    if (txt.includes("***gbfen***")) {
        $('#gamedetected').empty();
        $('#gamedetected').append('Game detected on GrandBastard');
        fen = txt.replace("***gbfen***", "");
        var chess = new Chess();
        chess.load(fen);
        turn = chess.turn();
        return chess.fen()
    }
    if (txt.includes("***ccfen***")) {
        $('#gamedetected').empty();
        $('#gamedetected').append('Game detected on Chess.com');
        txt = txt.replace("***ccfen***", "");
        arr = txt.split("*****");
        var arrayLength = arr.length;
        var chess = new Chess();
        for (var i = 0; i < arrayLength; i++) {
            chess.move(arr[i])
        }
        turn = chess.turn();
        return chess.fen()
    }
    if (txt.includes("***lifen***")) {
        $('#gamedetected').empty();
        $('#gamedetected').append('Game detected on Lichess.org');
        txt = txt.replace("***lifen***", "");
        arr = txt.split("*****");
        var arrayLength = arr.length;
        var chess = new Chess();
        for (var i = 0; i < arrayLength; i++) {
			if(arr[i]!=''){
            arr[i] = arr[i].replace("х", "x");
            a = chess.move(arr[i], {
                sloppy: !0
            });
            console.log(a + arr[i])
			}
        }
        turn = chess.turn();
        return chess.fen()
    }
}

function query_for_fen(){
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		a=makeid();
		b=makeid();
		chrome.tabs.sendMessage(tabs[0].id, {a:b});
	});
}

	chrome.extension.onMessage.addListener(function(response, sender, sendResponse) {
		console.log(response);
		console.log(Object.keys(response));
	  if (Object.keys(response).length == 3) {
		  console.log(response);
            if (response.d != 'no') {
                console.log(response.d);
                fen = fenfrommoves(response.d);
                console.log(response.o);
                orient = response.o;
                if (lastpos != fen) {
                    lastpos = fen;
                    newpos(fen)
                }
            } else {}
	  }
	    return Promise.resolve("Dummy");
	});
	
function scanforfen() {
    chrome.tabs.query({
        active: !0,
        currentWindow: !0
    }, function(tabs) {
        var port = chrome.tabs.connect(tabs[0].id);
        port.postMessage({
            counter: 1
        });
        port.onMessage.addListener(function getResp(response) {
            if (response.dom != 'no') {
                console.log(response.dom);
                fen = fenfrommoves(response.dom);
                console.log(response.orient);
                orient = response.orient;
                if (lastpos != fen) {
                    lastpos = fen;
                    newpos(fen)
                }
            } else {}
        })
    })
}
$(window).on('load', function() {
    board = ChessBoard('board', 'start');
    stockfish = STOCKFISH();
    stockfish.postMessage("ucinewgame");
    stockfish.onmessage = function(event) {
        console.log(event);
        if (event.includes('bestmove')) {
            $('#chess').empty();
            arr = event.split(" ");
            best = arr[1];
            toplay = turn == 'w' ? 'White' : 'Black';
            next = turn == 'w' ? 'black' : 'white';
            if (!event.includes('ponder') && event.includes('(none)')) {}
            if (event.includes('ponder')) {
                $('#chess').append(toplay + ' to play, best move is ' + best + '<br>' + 'Best response for ' + next + ' is ' + arr[3])
            }
            if (!event.includes('ponder') && !event.includes('(none)')) {
                $('#chess').append(toplay + ' to play, best move is ' + best)
            }
            calculating = 'no';
            drawarrow(best, 'blue', 'overlay1');
            drawarrow(arr[3], 'red', 'overlay2')
            pr = 0
        } else {
            if (event.includes('score mate')) {
                arr = event.split("score mate ");
                arr1 = arr[1].split(" ");
                $('#mate').empty();
                if (Math.abs(arr1[0]) == 0) {
                    $('#mate').append("Checkmate")
                } else {
                    $('#mate').append("Checkmate in " + Math.abs(arr1[0]))
                }
            }
            if (calculating == 'yes') {
                pr = pr + 1;
                pro = 100 - 100 * Math.exp(-pr / 30);
                $('#progBar').attr('value', Math.round(pro))
            }
        }
    };
    $('#goto').click(function() {
        chrome.tabs.create({
            url: $(this).attr('href')
        })
    });
    ratethisapp();
    query_for_fen();
    setInterval(function() {
        query_for_fen();
    }, 1000)
});

function coord(move) {
    var alphabet = ["a", "b", "c", "d", "e", "f", "g", "h"];
    var lets = move.substring(0, 1);
    var lete = move.substring(2, 3);
    var nums = move.substring(1, 2) * 1.0;
    var nume = move.substring(3, 4) * 1.0;
    var slet = alphabet.indexOf(lets) + 1;
    var elet = alphabet.indexOf(lete) + 1;
    if (orient == 'white') {
        var obj = {
            slet: slet,
            elet: elet,
            nums: nums,
            nume: nume
        }
    } else {
        var obj = {
            slet: 9 - slet,
            elet: 9 - elet,
            nums: 9 - nums,
            nume: 9 - nume
        }
    }
    return obj
}

function drawarrow(move, color, div) {
    var co = coord(move);
    b = 344 / 8;
    var xs = 2 + b / 2 + b * (co.slet - 1);
    var ys = 350 - (b / 2 + b * (co.nums - 1)) - 1;
    var xe = 2 + b / 2 + b * (co.elet - 1);
    var ye = 350 - (b / 2 + b * (co.nume - 1)) - 1;
    vx = xe - xs;
    vy = ye - ys;
    d = Math.sqrt(vx * vx + vy * vy);
    vux = 1.0 * vx / d;
    vuy = 1.0 * vy / d;
    xs = xs + 10 * vux;
    xe = xe - 10 * vux;
    ys = ys + 10 * vuy;
    ye = ye - 10 * vuy;
    a = '<svg width="350" height="350">';
    a = a + '<defs>';
    a = a + '<marker id="arrow' + color + '" markerWidth="13" markerHeight="13" refx="2.5" refy="7" orient="auto" >';
    a = a + '<path d="M1,5.5 L3.5,7 L1,8.5 " style="fill: ' + color + ';" />';
    a = a + '</marker>';
    a = a + '</defs>';
    a = a + '<path d="M' + xs + ',' + ys + ' L' + xe + ',' + ye + '"';
    a = a + 'style="stroke:' + color + '; stroke-width: 8px; fill:' + color + ';';
    a = a + 'marker-end: url(#arrow' + color + ');"/> </svg>';
    $('#' + div).empty();
    $('#' + div).append(a)
}

function ratethisapp() {
    $.ajax({
        type: 'GET',
        url: "http://www.grandbastard.com/ratethisapp.php",
        success: function(response) {
            $('#fenleft').empty();
            $('#fenleft').append(response);
            $('#goto2').click(function() {
                chrome.tabs.create({
                    url: $(this).attr('href')
                })
            })
        }
    })
}