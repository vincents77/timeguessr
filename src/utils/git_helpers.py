import subprocess

def print_git_branch():
    try:
        branch_name = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]).decode().strip()
        print(f"🌿 Current Git branch: {branch_name}")
    except subprocess.CalledProcessError:
        print("❌ Unable to detect Git branch.")

def print_git_summary():
    try:
        status = subprocess.check_output(["git", "status", "-s", "-b"]).decode().strip()
        print(f"📝 Git Status:\n{status}")
    except subprocess.CalledProcessError:
        print("❌ Unable to fetch Git status.")

def auto_create_branch(branch_name):
    try:
        print(f"🌱 Creating and switching to branch '{branch_name}'...")
        subprocess.run(["git", "checkout", "-b", branch_name], check=True)
        print(f"✅ Created and switched to new branch '{branch_name}'.")
    except subprocess.CalledProcessError:
        print(f"❌ Failed to create branch '{branch_name}'. It may already exist.")

def smart_git_commit_and_push(commit_message="Auto: Insert events + refresh events.json", branch=None, create_if_missing=False):
    try:
        if branch:
            print(f"🔄 Switching to branch '{branch}'...")
            try:
                subprocess.run(["git", "checkout", branch], check=True)
            except subprocess.CalledProcessError:
                if create_if_missing:
                    auto_create_branch(branch)
                else:
                    print(f"❌ Branch '{branch}' does not exist and create_if_missing is False.")
                    return

        print("📂 Git: Checking for changes...")
        status_output = subprocess.check_output(["git", "status", "--porcelain"]).decode().strip()

        if not status_output:
            print("✅ No changes to commit. Skipping Git operations.")
            return

        print("📂 Git: Staging updated files...")
        subprocess.run(["git", "add", "."], check=True)

        print("✍️ Git: Committing...")
        subprocess.run(["git", "commit", "-m", commit_message], check=True)

        print("🚀 Git: Pushing to remote...")
        subprocess.run(["git", "push"], check=True)

        print("✅ Git push completed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Git push failed: {e}")
        print("🔄 Attempting to set upstream and retry push...")
        try:
            current_branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]).decode().strip()
            subprocess.run(["git", "push", "--set-upstream", "origin", current_branch], check=True)
            print(f"✅ Upstream set for branch '{current_branch}' and push succeeded!")
        except subprocess.CalledProcessError as e2:
            print(f"❌ Git upstream setup failed: {e2}")