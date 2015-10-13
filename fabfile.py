from contextlib import contextmanager
import time

from fabric.api import *
from fabric.contrib.files import exists
import os


# no passwords stored here, all host authentication is in  ~/.ssh/config
env.use_ssh_config = True
env.roledefs = {
    'development': ['127.0.0.1'],
    'staging': ['staging.couchpod.com'],
    'production': ['production.couchpod.com']
}
# env.roles = ['development'] # default role is local dev

# local root path relative to the location of this fabric file
# this allows us to perform fab commands from anywhere in the tree
env.local_root_path = os.path.dirname(os.path.realpath(__file__))


@task
def dev():
    """Set local development environment"""
    puts("local development mode")
    env.path = os.path.dirname(os.path.realpath(__file__))
    env.path_recordings = '%s/storage/recordings' % env.path
    env.path_profile_images = '%s/storage/profile_images' % env.path
    env.path_current = '%s/system' % env.path
    env.pip_build_cache = '%s/cache/pip.cache/' % env.path
    env.pip_download_cache = '%s/cache/pip.downloads/' % env.path
    puts("path: %s" % env.path)


@task
def staging():
    """Set remote staging environment"""
    puts("Deploying to staging environment")
    env.path = "/var/www/couchpod.com"
    env.path_backups = '%s/backups/' % env.path
    env.path_recordings = '%s/storage/recordings' % env.path
    env.path_profile_images = '%s/storage/profile_images' % env.path
    env.path_current = '%s/system' % env.path
    env.path_revisions = '%s/revisions' % env.path
    env.path_failsafe_revision = '%s/revisions/0-fallback' % env.path
    env.repo = "https://github.com/halfvector/quips-python.git"
    env.reload_file = '%s/tmp/uwsgi.sock' % env.path
    env.pip_build_cache = '%s/cache/pip.cache/' % env.path
    env.pip_download_cache = '%s/cache/pip.downloads/' % env.path
    env.roles = ['staging']


@task
def production():
    """Set remote production environment"""
    puts("Deploying to production environment")
    env.path = "/var/www/couchpod.com"
    env.path_backups = '%s/backups/' % env.path
    env.path_recordings = '%s/storage/recordings' % env.path
    env.path_profile_images = '%s/storage/profile_images' % env.path
    env.path_current = '%s/system' % env.path
    env.path_revisions = '%s/revisions' % env.path
    env.path_failsafe_revision = '%s/revisions/0-fallback' % env.path
    env.repo = "https://github.com/halfvector/quips-python.git"
    env.reload_file = '%s/tmp/uwsgi.sock' % env.path
    env.pip_build_cache = '%s/cache/pip.cache/' % env.path
    env.pip_download_cache = '%s/cache/pip.downloads/' % env.path
    env.roles = ['production']


@task
@roles('development')
def prep():
    """Install local development environment"""
    require('pip_download_cache', provided_by=[dev])
    puts("Bootstrapping python environment for local dev..")
    with lcd("system"):
        local('virtualenv --no-site-packages venv')
        with prefix('. venv/bin/activate'):
            # cache and re-use cache when possible
            local('pip install -q --download-cache %s -f %s pip-accel'
                  % (env.pip_download_cache, env.pip_download_cache))
            local('PIP_DOWNLOAD_CACHE=%s PIP_ACCEL_CACHE=%s pip-accel install -q -r ../requirements.txt'
                  % (env.pip_download_cache, env.pip_build_cache))


@task
@roles('development')
def dev_server():
    """Start production-style local server"""
    with lcd('%s/system' % env.local_root_path), show('debug'), prefix('. venv/bin/activate'):
        local('uwsgi --ini ../conf/uwsgi.ini')


@task
@roles('development')
def dev_server_debug():
    """Start debug-enabled auto-reloading local server"""
    with lcd('%s/system' % env.local_root_path), show('debug'), prefix('. venv/bin/activate'):
        local('python app/main.py webapp')


@task
@roles('development')
def reload():
    """Force local production-style server reload"""
    local('touch %s/tmp/uwsgi.sock' % env.local_root_path)


@task
def ps():
    run('ps faux')


@task
def df():
    run('df -h')


@task
def push_recordings():
    """HACK: Export local recordings"""
    require('path_recordings', provided_by=[production])
    put(env.local_root_path + '/storage/recordings/', env.path_recordings + '/*.ogg', mode=0664)


@task
def pull_recordings():
    """HACK: Import remote recordings"""
    require('path_recordings', provided_by=[production])
    get(env.path_recordings + '/*.ogg', env.local_root_path + '/storage/recordings/')


@task
def push_assets():
    """HACK: Export local assets. Handy for quick front-end production tweaks"""
    require('path_current', provided_by=[production])
    put(env.local_root_path + '/system/public/assets', env.path_current + '/public/', mirror_local_mode=True)


@task
def backup_db():
    require('path_backups', provided_by=[staging, production])
    backup_folder = 'quips_%s' % time.strftime('%Y%m%d_%H%M')
    tarfile = '%s.tar.gz' % backup_folder

    with cd(env.path_backups):
        run('mongodump -d quips -o %s' % backup_folder)
        with cd(env.path_backups):  # make archive relative to backups folder
            run('tar czf %s %s' % (tarfile, backup_folder))
            get(tarfile, env.local_root_path + '/backups/' + tarfile)


# tarfile must be a filename ending with .tar.gz inside of backups/
@task
def restore_db(tarfile):
    require('path_backups', provided_by=[staging, production])

    backup_src = env.local_root_path + '/backups/' + tarfile

    puts("checking file: " + backup_src)
    if not os.path.exists(backup_src):
        abort("Backup file not found")

    if not exists(env.path_backups):
        run('mkdir %(path_backups)s' % env)

    with cd(env.path_backups):
        put(backup_src, env.path_backups)
        run('tar zxf %s' % tarfile)
        run('mongorestore %s' % tarfile[:-7])


# commit_id should probably be the hash from 'git rev-parse production/master'
# but could also be used to perform a rollback to a previous revision
@task
def deploy(commit_id):
    require('path_revisions', provided_by=[staging, production])
    require('pip_download_cache', provided_by=[staging, production])

    path = os.path.dirname(os.path.realpath(__file__))
    with lcd(path):

        # verify commit_id hash is a valid commit using git's log
        with hide('output', 'running', 'warnings'), settings(warn_only=True):
            commit_test = local("git log %s -n 1 --oneline" % commit_id, True)
            if commit_test.startswith('fatal') or not commit_test.startswith(commit_id[:5]):
                puts("Canceling deploy; log does not contain commit: %s" % commit_id)
                exit()

        env.req_commit = commit_id
        env.req_path = '%(path_revisions)s/%(req_commit)s' % env

        # only proceed if deployed target hasn't been setup yet
        if exists(env.req_path):
            puts("Canceling deploy; destination already exists, remove it to proceed")
            exit()

        try:
            puts("Deploying commit: %s to %s" % (commit_id, env.req_path))
            with cd(env.path_revisions), hide('stdout'):
                run('git clone %(repo)s %(path_revisions)s/%(req_commit)s' % env, True)
                with cd('%(path_revisions)s/%(req_commit)s' % env):
                    run('git reset --hard %(req_commit)s' % env)

            puts("Installing requirements..")
            with cd(env.path), prefix('source venv/bin/activate'):
                # use cache when possible
                run('pip install -q --download-cache %s -f %s pip-accel'
                    % (env.pip_download_cache, env.pip_download_cache))
                run('PIP_DOWNLOAD_CACHE=%s PIP_ACCEL_CACHE=%s pip-accel install -q -r %s/requirements.txt'
                    % (env.pip_download_cache, env.pip_build_cache, env.req_path))

            # setup static paths
            puts("Updating paths..")
            with cd(env.path):
                # setup storage links
                run('ln -sfn %s %s/public/recordings' % (env.path_recordings, env.req_path))
                run('ln -sfn %s %s/public/profile_images' % (env.path_profile_images, env.req_path))

                path_conf = '%s/conf/' % env.req_path

                # install configuration
                put('conf/app.ini', path_conf, mode=0664)
                put('conf/flask.ini', path_conf, mode=0664)
                put('conf/uwsgi.ini', path_conf, mode=0664)

                # final step: link to new revision
                run('ln -sfn revisions/%s system' % commit_id)

            run('chown www-data:www-data %s' % env.req_path)

            # reload
            # run('touch %s' % env.reload_file)
            # do a less-than-graceful restart in case previous process died
            run('supervisorctl restart couchpod.com')

        except SystemExit:
            puts("Deploy failed; Removing bad-commit")
            remove(commit_id)


# automatic rollback to a previous version may not always be the best thing
# so rollback should be performed manually and specifically. this only repairs a symlink, using a known safe-fallback.
@task
def remove(bad_commit_id, good_commit_id):
    """Removes a revision from production. If doing so breaks 'current' symlink, it performs a fallback"""
    require('path_revisions', 'path_current', provided_by=[production])

    puts("removing commit: %s" % bad_commit_id)
    env.req_commit = bad_commit_id

    good_path = '%s/%s' % (env.path_revisions, good_commit_id)

    # flatten and evaluate path (to get rid of ../ traversal operators)
    env.req_path = '%(path_revisions)s/%(req_commit)s' % env
    puts('Removing revision: %s' % env.req_path)

    # a hardcoded sanity check just in case
    # to prevent any kind of traversal attacks
    if 'revisions' not in env.req_path:
        puts('Sanity Failure: request path does not contain "revisions" as expected')
        exit()

    # at this point we know at least once thing:
    # path_revisions + req_paths, evaluated fully, don't point to /, but to a path with 'revisions' in it
    # that's not a lot, but provides some tiny resemblance of sanity
    # TODO: find best-practices for doing this type of thing safely
    with cd(env.path_revisions):
        # rm -rf %s is just terrifying. mv %s is almost as scary.
        # if mv fails due to a permission issue (eg: trying to mv a system-dir)
        # then at least we have all of the files still available to merge back in
        # TODO: add user confirmation, and some sort of filesystem-jail
        run('mv %s tmp_delete_me' % env.req_path)
        run('rm -rf tmp_delete_me')

    # restore symlink if its broken
    with hide('commands'):
        if 'broken' in run('file %s' % env.path_current).stdout:
            puts("Detected broken release symlink. falling back to failsafe.")
            # TODO: we are forcing a file-overwrite here, could use a safety check
            run('ln -sfnr %s %s' % (good_path, env.path_current))

    # reload
    run('touch %s' % env.reload_file)


# TODO: try to crate an atomic deploy that knows how to roll-back
@contextmanager
def rollback_on_fail(rollback_callback):
    try:
        yield
    except SystemExit:
        rollback_callback()
        abort("Fail")


# run a rebuild task on remote server (eg: redownload profile images)
@task
def update_profile_images():
    with cd(env.path), prefix('source venv/bin/activate'):
        run('python system/app/manage.py -u')
