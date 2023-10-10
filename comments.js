// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 4001;

app.use(cors());
app.use(bodyParser.json());

const commentsByPostId = {};

// Get comments by post id
app.get('/posts/:id/comments', (req, res) => {
  const comments = commentsByPostId[req.params.id] || [];
  res.send(comments);
});

// Create comment
app.post('/posts/:id/comments', (req, res) => {
  const commentId = randomBytes(4).toString('hex'); // Generate random id
  const { content } = req.body; // Get content from body
  const comments = commentsByPostId[req.params.id] || []; // Get comments from post id
  comments.push({ id: commentId, content, status: 'pending' }); // Add comment to comments
  commentsByPostId[req.params.id] = comments; // Set comments to post id
  axios.post('http://localhost:4005/events', { // Send event to event bus
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });
  res.status(201).send(comments); // Send comments
});

// Receive event from event bus
app.post('/events', async (req, res) => {
  const { type, data } = req.body; // Get type and data from body
  if (type === 'CommentModerated') { // If event type is CommentModerated
    const { postId, id, status, content } = data; // Get postId, id, status, content from data
    const comments = commentsByPostId[postId]; // Get comments from post id
    const comment = comments.find(comment => { // Find comment from comments
      return comment.id === id;
    });
    comment.status = status; // Set status to comment
    await axios.post('http://localhost:4005/events', { // Send event to event bus
      type: 'CommentUpdated',
      data: {
        id,
        status,
        postId,
        content,
      },
    });
  }
  res.send({}); // Send empty object
});

app.listen(port, () => {
  console.log(`Comments service listening at