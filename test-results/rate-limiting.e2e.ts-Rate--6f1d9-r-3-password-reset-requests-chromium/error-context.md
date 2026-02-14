# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "FormTrap" [ref=e4] [cursor=pointer]:
      - /url: /
      - generic [ref=e6]: FormTrap
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: Forgot Password?
        - paragraph [ref=e13]: Enter your email and we'll send you a link to reset your password
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]: Email
          - textbox "Email" [ref=e19]:
            - /placeholder: Enter your email
          - paragraph [ref=e20]: Too many password reset requests. Please try again after 9:59:13 AM.
        - button "Send Reset Link" [ref=e21]:
          - generic: Send Reset Link
        - paragraph [ref=e22]:
          - text: Remember your password?
          - link "Back to login" [ref=e23] [cursor=pointer]:
            - /url: /login
  - region "Notifications alt+T"
```