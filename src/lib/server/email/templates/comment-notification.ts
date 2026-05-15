import { escapeHtml, renderEmail, textStyles } from './base'

export interface CommentNotificationData {
  commentAuthorName: string
  commentExcerpt: string
  postTitle: string
  postUrl: string
}

export function renderCommentNotification(data: CommentNotificationData): {
  html: string
  text: string
} {
  const subject = `New comment on "${escapeHtml(data.postTitle)}" by ${escapeHtml(data.commentAuthorName)}`

  const bodyHtml = `
    <p style="${textStyles.paragraph}">
      <strong>${escapeHtml(data.commentAuthorName)}</strong> commented on your post
      <strong>"${escapeHtml(data.postTitle)}"</strong>:
    </p>
    <blockquote style="border-left:3px solid #6366f1; padding:12px 16px; margin:0 0 16px; background-color:#1a1a1e; border-radius:0 8px 8px 0;">
      <p style="${textStyles.paragraph}">
        ${escapeHtml(data.commentExcerpt)}
      </p>
    </blockquote>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:16px 0;">
          <a href="${escapeHtml(data.postUrl)}" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">
            View Comment
          </a>
        </td>
      </tr>
    </table>
    <p style="${textStyles.muted}">
      You received this notification because someone commented on your post. You can disable these notifications in your settings.
    </p>
  `

  const bodyText = `${data.commentAuthorName} commented on your post "${data.postTitle}":

"${data.commentExcerpt}"

View the comment: ${data.postUrl}

You received this notification because someone commented on your post. You can disable these notifications in your settings.`

  return {
    html: renderEmail(subject, bodyHtml),
    text: bodyText,
  }
}
