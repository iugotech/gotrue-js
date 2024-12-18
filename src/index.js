import API, { JSONHTTPError } from 'micro-api-client';

import User from './user.js';

const HTTPRegexp = /^http:\/\//;
const defaultApiURL = `/.netlify/identity`;

export default class GoTrue {
  constructor({ APIUrl = defaultApiURL, AUTHUrl = '', audience = '', setCookie = false } = {}) {
    if (HTTPRegexp.test(APIUrl)) {
      console.warn(
        'Warning:\n\nDO NOT USE HTTP IN PRODUCTION FOR GOTRUE EVER!\nGoTrue REQUIRES HTTPS to work securely.',
      );
    }

    if (audience) {
      this.audience = audience;
    }

    this.setCookie = setCookie;

    this.api = new API(APIUrl);
    this.apiAuth = new API(AUTHUrl);
    this.userResponse = {};
  }

  async _request(path, options = {}) {
    options.headers = options.headers || {};
    const aud = options.audience || this.audience;
    if (aud) {
      options.headers['X-JWT-AUD'] = aud;
    }
    try {
      if(!options.toAuth){
        return await this.api.request(path, options);
      } else {
        return await this.apiAuth.request(path, options);
      }
    } catch (error) {
      if (error instanceof JSONHTTPError && error.json) {
        if (error.json.msg) {
          error.message = error.json.msg;
        } else if (error.json.error) {
          error.message = `${error.json.error}: ${error.json.error_description}`;
        }
      }
      throw error;
    }
  }

  settings() {
    return this._request('/settings');
  }

  signup(email, password, data) {
    return this._request('/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, data }),
    });
  }

  login(email, password, remember) {
    this._setRememberHeaders(remember);
    return this._request('/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=password&username=${encodeURIComponent(
        email,
      )}&password=${encodeURIComponent(password)}`,
    }).then((response) => {
      User.removeSavedSession();
      return this.createUser(response, remember);
    });
  }

  loginWithCaptcha(email, password, token, remember) {
    this._setRememberHeaders(remember);
    return this._request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: "password",
        username: email,
        password,
        captcha_token: token
      }),
      toAuth: true
    }).then((response) => {
      if(response.success){
        //this.userResponse = response.data;
        //this.remember = remember;
        //return
        
        User.removeSavedSession();
        return this.createUser(response.data, remember); 
        
      } else {
        throw new Error(response.message);
      }
    });
  }
  
  loginWithCaptchaWithVerification(email, password, token, remember) {
    this._setRememberHeaders(remember);
    return this._request('/api/loginForSmsVerification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: "password",
        username: email,
        password,
        captcha_token: token
      }),
      toAuth: true
    }).then((response) => {
      if(response.success){
        // this.userResponse = response.data;
        this.remember = remember;
        return response.data                
      } else {
        throw new Error(response.message);
      }
    });
  }

  loginWithCaptchaWithVerificationByEmail(email, password, token, remember) {
    this._setRememberHeaders(remember);
    return this._request('/api/loginForEmailVerification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: "password",
        username: email,
        password,
        captcha_token: token
      }),
      toAuth: true
    }).then((response) => {
      if(response.success){
        // this.userResponse = response.data;
        this.remember = remember;
        return response.data                
      } else {
        throw new Error(response.message);
      }
    });
  }

  loginMobiliz(token, server_id, remember) {
    this._setRememberHeaders(remember);
    return this._request('/api/loginMB', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: "password",
        server_id,
        token
      }),
      toAuth: true
    }).then((response) => {
      if(response.success){
        //this.userResponse = response.data;
        //this.remember = remember;
        //return
        
        User.removeSavedSession();
        return this.createUser(response.data, remember); 
        
      } else {
        throw new Error(response.message);
      }
    });
  }
  
  saveUser() {
    User.removeSavedSession();
    return this.createUser(this.userResponse, this.remember); 
  }

  saveUserWithData(user) {
    User.removeSavedSession();
    return this.createUser(user, this.remember); 
  }

  authorizeAzure(email, token, remember) {
    this._setRememberHeaders(remember);
    return this._request('/api/azurelogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        azure_token: token
      }),
      toAuth: true
    }).then((response) => {
      if(response.success){
        User.removeSavedSession();
        return this.createUser(response.data, remember);
      } else {
        throw new Error(response.message);
      }
    });
  }

  authorizeAzureCC(email, token, remember) {
    this._setRememberHeaders(remember);
    return this._request('/api/azurelogincc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        azure_token: token
      }),
      toAuth: true
    }).then((response) => {
      if(response.success){
        User.removeSavedSession();
        return this.createUser(response.data, remember);
      } else {
        throw new Error(response.message);
      }
    });
  }

  loginExternalUrl(provider) {
    return `${this.api.apiURL}/authorize?provider=${provider}`;
  }

  confirm(token, remember) {
    this._setRememberHeaders(remember);
    return this.verify('signup', token, remember);
  }

  requestPasswordRecovery(email) {
    return this._request('/recover', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }
  
  requestPasswordRecoveryWithCaptche(email, token) {
    return this._request('/api/recover', {
      method: 'POST',
      body: JSON.stringify({ 
        email,
        captcha_token: token
      }),
      toAuth: true
    });
  }

  recover(token, remember) {
    this._setRememberHeaders(remember);
    return this.verify('recovery', token, remember);
  }

  resetPasswordOnRecovery(recoveryToken, captchaToken, password, date) {
    return this._request('/api/resetPasswordOnRecovery', {
      method: 'POST',
      body: JSON.stringify({
        recoveryToken: recoveryToken,
        recaptchaToken: captchaToken,
        password,
        date: date
      }),
      toAuth: true
    });
  }

  acceptInvite(token, password, remember) {
    this._setRememberHeaders(remember);
    return this._request('/verify', {
      method: 'POST',
      body: JSON.stringify({ token, password, type: 'signup' }),
    }).then((response) => this.createUser(response, remember));
  }

  acceptInviteExternalUrl(provider, token) {
    return `${this.api.apiURL}/authorize?provider=${provider}&invite_token=${token}`;
  }

  createUser(tokenResponse, remember = false) {
    this._setRememberHeaders(remember);
    const user = new User(this.api, tokenResponse, this.audience, this.apiAuth);
    return user.getUserData().then((userData) => {
      if (remember) {
        userData._saveSession();
      }
      return userData;
    });
  }

  currentUser() {
    const user = User.recoverSession(this.api);
    user && this._setRememberHeaders(user._fromStorage);
    return user;
  }

  verify(type, token, remember) {
    this._setRememberHeaders(remember);
    return this._request('/verify', {
      method: 'POST',
      body: JSON.stringify({ token, type }),
    }).then((response) => this.createUser(response, remember));
  }

  _setRememberHeaders(remember) {
    if (this.setCookie) {
      this.api.defaultHeaders = this.api.defaultHeaders || {};
      this.api.defaultHeaders['X-Use-Cookie'] = remember ? '1' : 'session';
    }
  }
}

if (typeof window !== 'undefined') {
  window.GoTrue = GoTrue;
}
