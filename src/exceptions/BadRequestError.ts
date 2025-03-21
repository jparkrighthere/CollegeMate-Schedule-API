/**
 * Define 400 Bad Request Error based on HTTPError
 * Contains HTTP Status code and message for commonly caused
 *     400 Bad Request Error
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import HTTPError from './HTTPError';

/**
 * BadRequest Error is a type of HTTPError, of which status code is 400
 */
export default class BadRequestError extends HTTPError {
  /**
   * Constructor for BadRequest Error
   */
  constructor() {
    super(400, 'Bad Request');
  }
}
