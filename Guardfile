UNICORN_PID_FILE='tmp/gunicorn.pid'

# rebuild css from sass/scss
#guard :compass do
#	watch(/^stylesheets\/(.+)\.s[ac]ss$/)
#end

#guard :sass,
#    :input => 'app/stylesheets',
#    :output => 'public/assets/css',
#    :smart_partials => true,
#    :all_on_start => true,
#    :style => :compact,
#    :shallow => true,
#    :cache_location => 'tmp/sass-cache'

# rebuild and minify js
#guard :sprockets, {
#		:minify => true,
#		:destination => 'public/assets/js/',
#		:asset_paths => 'javascript'
#} do
#	watch(/^javascript\/(.*)\.(js)$/)
#end

# capture .py code changes
guard :shell do
	watch /^app\/(.*\.py)$/ do |m|
		#`touch tmp/pychange`
		msg = "Code-change detected: #{m[1]}"
		print "-> #{msg}\n"

		if File.exists?(UNICORN_PID_FILE)
		    pid = File.read(UNICORN_PID_FILE).to_i
		    print "Restarting gunicorn with pid: #{pid}\n"
            Process.kill "HUP", pid

        else
            print "Warning: not restarting gunicorn; pid not found at: #{UNICORN_PID_FILE}\n"
        end

        `touch tmp/reload`

	end

	#watch(%r{tmp/gunicorn.pid}) do
	#    print "yey change in pid\n"
	#end

#	watch 'tmp/pychange' do |m|
#		"-> restarting gunicorn"
#	end
end

# refresh a browser on assets change
# this means templates, css, javascript, and code
#guard 'livereload', :host => '192.168.1.11', :grace_period => 0.1 do
#	watch(%r{app/.+\.(html|mustache|yaml)$})
#	watch(%r{public/assets/.+\.(js|css)$})
#	watch(%r{tmp/gunicorn.pid})
#	watch(%r{tmp/reload})
#	watch(%r{^app/.*\.py$})
#end
