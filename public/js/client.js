const socket = io.connect();

let roomId;
let currentQuestionIndex = 0;
let scores = {};

document.getElementById("scoresandtimer").style.display = "none";
document.getElementById("questioncontainer").style.display = "none";
document.getElementById("loading").style.display = "none";
document.getElementById("mcq-question").style.display = "none";
document.getElementById("yourScore").style.display = "none";
document.getElementById("opponentScore").style.display = "none";
document.getElementById("results").style.display = "none";
document.getElementById("backToHome").style.display = "none";


document.getElementById('playButton').addEventListener('click', () => {
  socket.emit('joinGame');
  console.log('Joined game');
});

function leaveRoom(room) {
  socket.emit('leaveRoom', room);
}

socket.on('waitingForPlayers', () => {
  document.getElementById('waitingForPlayers').innerText = 'Waiting for players...';
  document.getElementById('loading').style.display = 'block';
});

socket.on('startGame', (data) => {
  document.getElementById('waitingForPlayers').style.display = 'none';
  document.getElementById('playButton').style.display = 'none';
  document.getElementById('title').style.display = 'none';
  document.getElementById('loading').style.display = 'none';
  document.getElementById('main-content').style.display = 'none';

  
  // Show question and options
  document.getElementById("questioncontainer").style.display = 'block'; 
  document.getElementById('mcq-question').style.display = 'block';
  document.getElementById("scoresandtimer").style.display = "block";
  document.getElementById("yourScore").style.display = "block";
  document.getElementById("yourScore").innerText = "You: 0";
  document.getElementById("opponentScore").style.display = "block";
  document.getElementById("opponentScore").innerText = "Opponent: 0";
  roomId = data.roomId;
  

  console.log('Game started');
  displayQuestion(data.question);

});

socket.on('updateScores', (data) => {
  scores = data.scores;
  displayScores();
});

socket.on('nextQuestion', (question) => {
  displayQuestion(question);
});

socket.on('endGame', (data) => {
  document.getElementById('mcq-question').style.display = 'none';
  document.getElementById("scoresandtimer").style.display = "none";
  document.getElementById("questioncontainer").style.display = 'none';
  const scoresDiv = document.getElementById('results');
  const resultMessage = data.result || "You are Done! Waiting for opponent to finish.";
  scoresDiv.innerHTML = `${resultMessage}<br>Your Score: ${data.score}<br>Opponent's Score: ${data.opponentScore}`;
  document.getElementById("results").style.display = "block";
  document.getElementById("backToHome").style.display = "block";
});

function displayQuestion(question) {
  const questionContainer = document.getElementById('question');
  const optionsDiv = document.getElementById('options');
  
  questionContainer.innerText = question.question;
  optionsDiv.innerHTML = '';

  question.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.classList.add('option-button');
    button.innerText = option;
    button.onclick = () => {
      socket.emit('answer', { roomId, playerId: socket.id, answer: index });
    };
    optionsDiv.appendChild(button);
  });
}

function displayScores() {
  if (!scores || Object.keys(scores).length === 0) {
    console.error("Scores are not defined or empty.");
    return;
  }
  
  const yourScoreDiv = document.getElementById('yourScore');
    const opponentScoreDiv = document.getElementById('opponentScore');
    const opponentId = Object.keys(scores).find(id => id !== socket.id);
    const opponentScore = scores[opponentId] !== undefined ? scores[opponentId] : "Still playing";
    yourScoreDiv.innerText = `You: ${scores[socket.id]}`;
    opponentScoreDiv.innerText = `Opponent: ${opponentScore}`;
}
