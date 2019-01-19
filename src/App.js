import React, { Component } from 'react';
import './App.css';
import { ToastContainer, toast } from 'react-toastify'; //show notification for the db event
import * as moment from 'moment';
import * as RxDB from 'rxdb';
import { QueryChangeDetector } from 'rxdb'; //avoid conflict from RxDB reactivity
const schema = {
  title: 'Project schema',
  description: 'Database schema for an project',
  version: 0,
  type: 'object',
  properties: {
    id: {
      type: 'string',
      primary: true
    },
    project: {
      type: 'string'
    }
  },
  required: ['project']
}

RxDB.plugin(require('pouchdb-adapter-idb'));//use IndexDB as the storage engine
RxDB.plugin(require('pouchdb-adapter-http'));//syncing to a remote db over HTTP

// QueryChangeDetector.enable();
QueryChangeDetector.enableDebugging(); //optimize the query

const syncURL = 'https://b67f3ef7-3ed4-4aca-be45-f2263c9a52c7-bluemix:94a29229476ca706ebd35f8681c418c14be543f4b38226ac59bd000dd30d6157@b67f3ef7-3ed4-4aca-be45-f2263c9a52c7-bluemix.cloudant.com/';
// const syncURL = 'http://localhost:5984/';
const dbName = 'projectdb';

class App extends Component {
  async createDatabase() {
    const db = await RxDB.create( // local DB
      {name: dbName, adapter: 'idb', password: '12345678'}
    );
    db.waitForLeadership().then(() => { //make sure that only one tab is managing the DB
      document.title = 'x ' + document.title;
    });
    const projectsCollection = await db.collection({ // db schema creating
      name: 'projects',
      schema: schema
    });
    projectsCollection.sync({ remote: syncURL + dbName + '/'});
    return db;
  }
  
  constructor(props) {
    super(props);
    this.state = {
      newProject: '', projects: []
    };
    this.subs = [];
    this.addProject = this.addProject.bind(this);
    this.handleProjectChange = this.handleProjectChange.bind(this);
  }

  async componentDidMount() {
    this.db = await this.createDatabase();

    const sub = 
      this.db.projects.find().sort({id: 1}).$.subscribe(projects => {
        if(!projects)
          return;
        toast('Reloading projects');
        this.setState({projects: projects});
      });
    this.subs.push(sub);
  }
  componentWillUnmount() {
    this.subs.forEach(sub => sub.unsubscribe());
  }
  renderProjects() {
    return this.state.projects.map(({id, project}) => {
      const date = moment(id, 'x').fromNow();
      return (
        <tr key={id}>
          <td>{date}</td>
          <td>{project}</td>
        </tr>
      );
    });
  }
  handleProjectChange(event) {
    this.setState({newProject: event.target.value});
  }
  async addProject() {
    const id = Date.now().toString();
    const newProject = {id, project: this.state.newProject};

    await this.db.projects.insert(newProject);
    this.setState({newProject: ''});
  }

  render() {
    return (
      <div className="App container">
        {/* <ToastContainer autoClose={3000} /> */}
        <div className="add-project">
          <button onClick={this.addProject} className="btn btn-primary btn-success">Add project</button>
          <input type="text" placeholder="Project" value={this.state.newProject} className="form-control"
            onChange={this.handleProjectChange} />
        </div>
        <div className="table-data">
          <table className="table table-condensed">
            <thead>
              <tr>
                <th>Time</th>
                <th>Project</th>
              </tr>
            </thead>
            <tbody>
              {this.renderProjects()}
            </tbody>
          </table>
        </div>
        {/* <div>{this.renderProjects()}</div> */}
      </div>
    );
  }
}

export default App;
