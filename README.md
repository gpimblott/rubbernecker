# rubbernecker
![Rubbernecker](https://github.com/Rory80Hz/rubbernecker/blob/master/public/images/android-icon-192x192.png?raw=true)
Pivotal is useful. But it has a weird and complex layout so it is hard to use for day to day stuff. Rubbernecker simplifies it in a Kanban-esque fashion.

It organises things by status, displays simple information about each story, who is working on it, and how long it has been in that state. 

On my project we have multiple teams working off a single backlog, Pivotal has no concept of this.  This teams also like traditional Kanban baords

This fork has been designed to handle each team as a project
All searches are across multiple projects and transparently aggregated
It also focussed on providing stats across projects to make it easier to generate reports

Includes : Kanban boards oer team, Roadmap display, Story and Epic searching

##Installation

Clone this repo

``` 
npm install
```

## Running
After completing above installation instructions, to run locally without Basic Authentication:

``` 
DEBUG=rubbernecker:* PIVOTAL_API_KEY=your-api-key PIVOTAL_PROJECT_ID=your-project-id npm start
```

If you want to try out the stunning Basic Auth (useful for when you don't want everyone getting straight to your story overviews)
``` 
DEBUG=rubbernecker:* PIVOTAL_API_KEY=your-api-key PIVOTAL_PROJECT_ID=your-project-id USE_AUTH=true USERNAME=username PASSWORD=password npm start
```

### Deploying
I've been deploying this to Openshift and Heoku (it works on both):

Environment variables that can  be set (some are mandatory)
```
    PIVOTAL_API_KEY: Api key goes here (mandatory)
    USE_AUTH: true
    USERNAME: sensible username goes here
    PASSWORD: sensible long password goes here
    DEFAULT_PROJECTS: comma separated list of project ids that are searched (Madatory - at least 1)
    DEFAULT_LABELS: The labels that you are really interested in (Pivotal creates lots)
    MILESTONE_LABELS: The labels to use for the roadmap (MAX 3)
    GOOGLE_ID: Google analytics id if you are using it
```
