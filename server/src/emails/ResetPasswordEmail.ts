import { WEB_DOMAIN } from "../constants"

export const ResetPasswordEmail = (un: string, token: string) => {

  return (
    `
        <style>
        .email-wrapper {
          padding: 10px;
          width: 50%;
          margin: auto;
          font-family: Arial, Helvetica, sans-serif;
          color: #444444;
        }
        .button-wrapper{
            text-align: center;
        }
        .button {
          margin-top: 50px;
          background-color: #4299e1;
          color: #fff;
          font-size: 30px;
          text-decoration: none;
          padding: 15px 80px;
          width: 200px;
          font-weight: 400;
          border-radius: 5px;
        }
        .message {
          margin-bottom: 50px;
        }
        .message2 {
          margin-top: 50px;
        }
      </style>
      
      <div class="email-wrapper">
        <h1>Hey ${un},</h1>
        <h4 class="message">We got your request to change your password!</h4>
        <div class='button-wrapper'>
          <a href="${WEB_DOMAIN}change-password/${token}" class="button">
            Reset Password
          </a>
        </div>
      
        <h3 class="message2">
          Just so you know: You have 3 hours to pick your new password.
          <br />
          After that, you'll have to ask for a new one.
          <br />
          <br />
          Didn't ask for a new password? You can ignore this email.
        </h3>
      </div>
        `
  )
}