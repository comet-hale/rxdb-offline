import React, { Component } from 'react';
import './App.css';
import { ToastContainer, toast } from 'react-toastify'; //show notification for the db event
import * as moment from 'moment';
import * as RxDB from 'rxdb';
import { QueryChangeDetector } from 'rxdb'; //avoid conflict from RxDB reactivity
const schema = {
  title: 'Anonymous chat schema',
  description: 'Database schema for an anonymous chat',
  version: 0,
  type: 'object',
  properties: {
    id: {
      type: 'string',
      primary: true
    },
    message: {
      type: 'string'
    }
  },
  required: ['message']
}

RxDB.plugin(require('pouchdb-adapter-idb'));//use IndexDB as the storage engine
RxDB.plugin(require('pouchdb-adapter-http'));//syncing to a remote db over HTTP

// QueryChangeDetector.enable();
QueryChangeDetector.enableDebugging();

const syncURL = 'https://b67f3ef7-3ed4-4aca-be45-f2263c9a52c7-bluemix:94a29229476ca706ebd35f8681c418c14be543f4b38226ac59bd000dd30d6157@b67f3ef7-3ed4-4aca-be45-f2263c9a52c7-bluemix.cloudantnosqldb.appdomain.cloud/projects-test/';
const dbName = 'projects';
const syncURL1 = 'http://' + window.location.hostname + ':10102/';
console.log('host: ' + syncURL1);

class App extends Component {
  async createDatabase() {
    const db = await RxDB.create(
      {name: dbName, adapter: 'idb', password: '12345678'}
    );
    db.waitForLeadership().then(() => { //make sure that only one tab is managing the DB
      document.title = 'x ' + document.title;
    });
    const messagesCollection = await db.collection({ // db schema creating
      name: 'messages',
      schema: schema
    });
    messagesCollection.sync({ remote: syncURL+'23f30964300c6c9b61b136e1f52e5798'});
    return db;
  }
  
  constructor(props) {
    super(props);
    this.state = {
      newMessage: '', messages: []
    };
    this.subs = [];
    this.addMessage = this.addMessage.bind(this);
    this.handleMessageChange = this.handleMessageChange.bind(this);
  }

  async componentDidMount() {
    this.db = await this.createDatabase();

    const sub = 
      this.db.messages.find().sort({id: 1}).$.subscribe(messages => {
        if(!messages)
          return;
        toast('Reloading messages');
        this.setState({messages: messages});
      });
    this.subs.push(sub);
  }
  componentWillUnmount() {
    this.subs.forEach(sub => sub.unsubscribe());
  }
  renderMessages() {
    return this.state.messages.map(({id, message}) => {
      const date = moment(id, 'x').fromNow();
      return (
        <div key={id}>
          <p>{date}</p>
          <p>{message}</p>
          <hr/>
        </div>
      );
    });
  }
  handleMessageChange(event) {
    this.setState({newMessage: event.target.value});
  }
  async addMessage() {
    const id = Date.now().toString();
    const newMessage = {id, message: this.state.newMessage};

    await this.db.messages.insert(newMessage);
    this.setState({newMessage: ''});
  }

  render() {
    return (
      <div className="App">
        <ToastContainer autoClose={3000} />
        
        {/* <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to React</h2> 
        </div> */}
  
        <div>{this.renderMessages()}</div>
  
        <div id="add-message-div">
          <h3>Add Message</h3>
          <input type="text" placeholder="Message" value={this.state.newMessage}
            onChange={this.handleMessageChange} />
          <button onClick={this.addMessage}>Add message</button>
        </div>
      </div>
    );
  }
}

export default App;
