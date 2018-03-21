var recognizer;
var recorder;
var callbackManager;
var audioContext;

// Only when both recorder and recognizer are ready do we have a ready application
// I'm keeping these so I can use them with other applications
var recorderReady = false;
var recognizerReady = false;

var keywordIndicator = document.getElementById('recording_indicator');

// TEMP
var outputContainer;
var a,b=0;


// the phones we want to detect
var wordList = [
	["NEW-TAB", "N UW T AA B"],
	["CLOSE-TAB", "K L OW S T AE B "],
	["SCROLL-UP", "S K R OW L AH P"],
	["SCROLL-DOWN", "S K R OW L D AW N"],
	["GO-BACK", "G OW B AE K"],
	["GO-FORWARD", "G OW F AO R W ER D"],
	["REFRESH", "R IH F R EH SH"]
];

var grammars = [{
	g: {
		numStates: 1,
		start: 0,
		end: 0,
		transitions: [{
			from: 0,
			to: 0,
			word: "NEW-TAB"
		}, {
			from: 0,
			to: 0,
			word: "CLOSE-TAB"
		}, {
			from: 0,
			to: 0,
			word: "SCROLL-UP"
		}, {
			from: 0,
			to: 0,
			word: "SCROLL-DOWN"
		}, {
			from: 0,
			to: 0,
			word: "GO-BACK"
		}, {
			from: 0,
			to: 0,
			word: "GO-FORWARD"
		}, {
			from: 0,
			to: 0,
			word: "REFRESH"
		}]
	}
}];

// When the page is loaded we spawn a new recognizer worker and call getUserMedia to request access to the microphone
window.onload = function() {

	recognizer = new Worker('lib/recognizer.js');

	callbackManager = new CallbackManager();

	// TEMP
	outputContainer = document.getElementById("output");
	// document.getElementById('start_button').onclick = startRecording;

	// initialize Web Audio variables
	try {

		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
		window.URL = window.URL || window.webkitURL;

		audioContext = new AudioContext();

	} catch (e) {
		// report incompatible browser
	}

	if (navigator.getUserMedia) {

		navigator.getUserMedia({
			audio: true
		}, function(stream) {

			var input = audioContext.createMediaStreamSource(stream);

			var audioRecorderConfig = {
				errorCallback: function(x) {}
			};

			recorder = new AudioRecorder(input, audioRecorderConfig);

			// If a recognizer is ready we pass it to the recorder
			if (recognizer) {
				recorder.consumers = [recognizer];
			}

			recorderReady = true;

		}, function(e) {

		});

	}

	recognizer.onmessage = function() {

		// I need this nested event listener because the first time a message is triggered we need to trigger other things that we never need to trigger again
		recognizer.onmessage = function(e) {

			// if an id to be used with the callback manager
			// this is needed to start the listening
			if (e.data.hasOwnProperty('id')) {

				var data = {};

				if (e.data.hasOwnProperty('data')) {
					data = e.data.data;
				}

				var callback = callbackManager.get(e.data['id']);

				if (callback) {
					callback(data);
				}

			}

			// if a new hypothesis has been created
			if (e.data.hasOwnProperty('hyp')) {

				var hypothesis = e.data.hyp;

				if (outputContainer) {
					console.log(hypothesis);
					var i=hypothesis.length;
					if(i>b){
						a=hypothesis.split(" ");
						b=i;
						window.c=a[a.length-1];
						console.log(c);
					}
					else{
						window.c="";
						console.log(" ");
					}
					outputContainer.innerHTML = hypothesis;
				}

			}

			// if an error occured
			if (e.data.hasOwnProperty('status') && (e.data.status == "error")) {

			}

		};

		// Once the worker is fully loaded, we can call the initialize function
		// You can pass parameters to the recognizer, such as : {command: 'initialize', data: [["-hmm", "my_model"], ["-fwdflat", "no"]]}
		postRecognizerJob({
			command: 'initialize'
		}, function() {

			if (recorder) {
				recorder.consumers = [recognizer];
			}

			postRecognizerJob({
				command: 'addWords',
				data: wordList
			}, function() {
				feedGrammar(grammars, 0);

				startRecording();

			});

		});

	};

	recognizer.postMessage('');

};

function postRecognizerJob(message, callback) {

	var msg = message || {};

	if (callbackManager) {
		msg.callbackId = callbackManager.add(callback);
	}

	if (recognizer) {
		recognizer.postMessage(msg);
	}

}

function feedGrammar(g, index, id) {

	if (index < g.length) {

		postRecognizerJob({
			command: 'addGrammar',
			data: g[index].g
		}, function(id) {
			feedGrammar(grammars, index + 1, {
				id: id
			});
		});

	} else {
		recognizerReady = true;
	}

}

// This starts recording. We first need to get the id of the grammar to use
function startRecording() {
	if (recorder && recorder.start(0)) {
		keywordIndicator.style.display = 'block';
	}
}
