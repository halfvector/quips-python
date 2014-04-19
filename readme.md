# quips-python

Quips is a micro-podcasting site. It's neat for sharing quips, motivational phrases, and "the drop" from your favorite dubstep song.

[Deployment system and helpers](https://github.com/halfvector/quips-deployment)

- [Trello Board](https://trello.com/b/wkVA1cK1/project-quips)
- [The site](http://what.you.say.icanhaserror.com/)

The "quips" name is a placehoder. I'm open to a new one.

#### Frontend
- Backbone.js - MVP front-end framework
- domReady, Qwery, Bonzo, Bean - "The Jeesh", a component-based jQuery replacement
- reqwest, vague-time - micro supplements

#### Backend
- Python - everything on the back is python, including deployment tools
- Flask - core web-server framework
- werkzeug - minimalist C#-attributes style RESTful routing
- MongoEngine - MongoDB ODM classes
- Twython - Twitter-API authentication

#### Tool-chain
- Gulp.js - build SASS/JS and push LiveReload browser updates
- Foreman - easy way to spin up a bunch of custom services
- Ender.js / Bower - resolve and build JS dependencies 
- Emscripten - transcompile C++ -> Javascript to bring high-quality audio encoding to the browser
- Fabric - a python deployment tool with remote code-execution

#### Server
Nginx + uWSGI + Supervisor + MongoDB

I'm purposely trying to use Python tools over the wonderful Ruby/Node.js tools to see if I can assemble a pleasant and entirely Python-based stack.

#### For the future
- Give [Knockback.js](http://kmalakoff.github.io/knockback/) a try. Looks like best of Knockout.js + Backbone.js
- Transition JS to CoffeeScript and give [Monocle](http://monocle.tapquo.com/) a try
- Make up an excuse to use selectize.js/select2.js, they make tagging so much fun

#### Files
- [**app/**](app) - all application code and assets   
- [**conf/**](conf) - generated config files are placed here on deploy
- [**public/**](public) - static site css, js, html assets and static
   
#### After Deployment 
- **venv/** - python environment  
- **public/** - gets a few symlinks for user-generated content (eg: recordings, images)


#### Configurations
All sensitive information for config files, like access-controls and oauth keys, are generated during deployment. None are stored in this code-base.
