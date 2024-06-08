const express = require('express');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const http = require('http').Server(app);
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile('./public/index.html');
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
    console.log(`Server is running on ${port}`);
});

// Replace <password> with your actual password
const uri = 'mongodb+srv://virenkundnani:m6RR80U1pDg5cbuC@cluster0.aaqagx0.mongodb.net/quizGame?retryWrites=true&w=majority';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('MongoDB Atlas connection successful'))
.catch(err => console.error('MongoDB Atlas connection error:', err));
const questionSchema = new mongoose.Schema({
    question: String,
    options: [String],
    correctOption: Number
});
const Question = mongoose.model('Question', questionSchema);


const waitingQueue = [];


io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    socket.on('joinGame', async () => {
        waitingQueue.push(socket);
        if (waitingQueue.length == 2) {
            const player1 = waitingQueue.shift();
            const player2 = waitingQueue.shift();
            
            const roomId = uuidv4();

            player1.join(roomId);
            player2.join(roomId);

            const questions = await Question.aggregate([{ $sample: { size: 10 } }]);
            console.log('Questions found: ' + questions.length);
            // Initialize scores
            const gameData = {
                [player1.id]: {score:0, questionIndex:0},
                [player2.id]: {score:0, questionIndex:0},
                questions,
                roomId
            };
            const players = [player1, player2];

            
            players.forEach(player => {
                player.emit('startGame', { roomId, question: questions[0], gameData});
            });

            console.log('Game started between ' + player1.id + ' and ' + player2.id + ' in ' + roomId);
            
            
            const answerHandler = ({ roomId, playerId, answer }) => {
                const playerData = gameData[playerId];
                const question = gameData.questions[playerData.questionIndex];

                if (question.correctOption === answer) {
                    playerData.score += 1;
                }

                playerData.questionIndex += 1;

                // Emit updated scores to both players
                io.to(roomId).emit('updateScores', {
                    scores: {
                        [player1.id]: gameData[player1.id].score,
                        [player2.id]: gameData[player2.id].score
                    }
                });

                if (playerData.questionIndex < gameData.questions.length) {
                    const nextQuestion = gameData.questions[playerData.questionIndex];
                    io.to(playerId).emit('nextQuestion', nextQuestion);
                } else {
                    const otherPlayerId = playerId === player1.id ? player2.id : player1.id;
                    const otherPlayerData = gameData[otherPlayerId];

                    // Check if both players have completed all questions
                    if (otherPlayerData.questionIndex >= gameData.questions.length) {
                        function resultMessage(playerscore, opponentscore){
                            if(playerscore > opponentscore){
                                return 'You Win!';
                            }
                            else if(playerscore < opponentscore){
                                return 'You Lose!';
                            }
                            else{
                                return 'It\'s a tie!';
                            }
                        }
                        
                        io.to(playerId).emit('endGame', {
                            score: gameData[playerId].score,
                            opponentScore: gameData[otherPlayerId].score,
                            result: resultMessage(gameData[playerId].score, gameData[otherPlayerId].score)
                        });

                        io.to(otherPlayerId).emit('endGame', {
                            score: gameData[otherPlayerId].score,
                            opponentScore: gameData[playerId].score,
                            result: resultMessage(gameData[otherPlayerId].score, gameData[playerId].score)
                        });

                        console.log('Game ended');

                        
                    } else {
                        io.to(playerId).emit('endGame', { score: playerData.score, opponentScore: otherPlayerData.score });
                    }
                }
            };

            player1.on('answer', answerHandler);
            player2.on('answer', answerHandler);
        }
        
        if(waitingQueue.length == 1){
                console.log('Waiting for more players...');
                socket.emit('waitingForPlayers');
        }

        socket.on('leaveRoom', (roomId) => {
            socket.leave(roomId);
            console.log(`User left room: ${roomId}`);
        });
        
    });

    socket.on('disconnect', () => {
        
        console.log('A user disconnected: ' + socket.id);
        const index = waitingQueue.indexOf(socket);
        if (index > -1) {
            waitingQueue.splice(index, 1);
        }
    });
});




