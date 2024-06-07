# Imports and runs the app from the __init__.py file in the flaskapp folder.

import os
import webapp as appr

app = appr.create_app()

if __name__ == "__main__":
    app.run(host='0.0.0.0')