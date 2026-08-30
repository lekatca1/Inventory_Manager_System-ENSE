package database;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import ch.vorburger.exec.ManagedProcessException;
import ch.vorburger.mariadb4j.DB;
import ch.vorburger.mariadb4j.DBConfigurationBuilder;

public class DatabaseManager {
    private DB db;
    private static final String DIR_PATH = "../database/db"; // Where the db will be stored
    private static final String BASE_PATH = "../database"; // Where mysqld.exe is located
    
    public DatabaseManager() {
    	File dataDir = new File(DIR_PATH);
    	
    	DBConfigurationBuilder config = DBConfigurationBuilder.newBuilder();
    	config.setPort(0); // Set to any available port
    	config.setDataDir(dataDir);
    	config.setBaseDir(new File(BASE_PATH)); 
    	
    	try {
    		db = DB.newEmbeddedDB(config.build());
    		db.start();
    		connectDB();
		} catch (ManagedProcessException e) {
			e.printStackTrace();
		}
    	
    	stopDB();
    }
    
    private void connectDB() {
    	try {
    	    Connection conn = DriverManager.getConnection("jdbc:mariadb://localhost/test", "root", "");
    	    System.out.println("Successfully connected to the database.");
    	} catch (SQLException e) {
    		e.printStackTrace();
    	}
    }
    
	private void stopDB() {
    	try {
    		db.stop();
    	} catch (ManagedProcessException e) {
    		e.printStackTrace();
    	}
	}
}