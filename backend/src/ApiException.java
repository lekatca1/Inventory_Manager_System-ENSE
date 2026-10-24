/** An error that maps directly to an HTTP status code and a JSON error message. */
public class ApiException extends RuntimeException {
    final int status;

    ApiException(int status, String message) {
        super(message);
        this.status = status;
    }
}
